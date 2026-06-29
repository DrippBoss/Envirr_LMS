import re
import secrets
from datetime import timedelta
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import serializers
from users.models import CustomUser, StudentProfile, EmailVerificationToken


def validate_mobile(value: str) -> str:
    """
    Accepts:
      - 10-digit number: 9876543210
      - With +91 prefix:  +919876543210
      - With 91 prefix:   919876543210
    Strips the country code, then validates:
      - Exactly 10 digits
      - Starts with 6, 7, 8, or 9 (valid Indian mobile range)
    """
    if not value:
        return value
    digits = re.sub(r'[\s\-]', '', value)  # strip spaces/hyphens
    if digits.startswith('+91'):
        digits = digits[3:]
    elif digits.startswith('91') and len(digits) == 12:
        digits = digits[2:]
    if not digits.isdigit():
        raise serializers.ValidationError('Mobile number must contain only digits.')
    if len(digits) != 10:
        raise serializers.ValidationError('Mobile number must be exactly 10 digits.')
    if digits[0] not in '6789':
        raise serializers.ValidationError('Enter a valid Indian mobile number (must start with 6, 7, 8, or 9).')
    return digits  # always store normalised 10-digit form


def validate_password_strength(password: str) -> str:
    """
    Enforces:
      - Minimum 8 characters
      - At least one uppercase letter
      - At least one lowercase letter
      - At least one digit
      - At least one special character (!@#$%^&* etc.)
    Raises serializers.ValidationError with a combined message if any rule fails.
    """
    errors = []
    if len(password) < 8:
        errors.append('at least 8 characters')
    if not re.search(r'[A-Z]', password):
        errors.append('at least one uppercase letter (A–Z)')
    if not re.search(r'[a-z]', password):
        errors.append('at least one lowercase letter (a–z)')
    if not re.search(r'\d', password):
        errors.append('at least one number (0–9)')
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?`~]', password):
        errors.append('at least one special character (e.g. !@#$%^&*)')

    if errors:
        raise serializers.ValidationError(
            'Password must contain: ' + ', '.join(errors) + '.'
        )
    return password

class StudentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentProfile
        fields = ('class_grade', 'board', 'avatar_url')

class UserSerializer(serializers.ModelSerializer):
    profile = StudentProfileSerializer(read_only=True)

    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'name', 'mobile', 'email', 'pending_email', 'role', 'can_build_courses', 'can_edit_questions', 'email_verified', 'assigned_subjects', 'profile')

class UpdateProfileSerializer(serializers.Serializer):
    """Handles partial profile updates — all fields optional."""
    name       = serializers.CharField(max_length=150, required=False, allow_blank=True)
    mobile     = serializers.CharField(max_length=15, required=False, allow_blank=True)
    username   = serializers.CharField(min_length=3, max_length=150, required=False)
    email      = serializers.EmailField(required=False)

    def validate_mobile(self, value):
        return validate_mobile(value)
    avatar_url = serializers.URLField(required=False, allow_blank=True)
    class_grade = serializers.CharField(required=False, allow_blank=True)
    board       = serializers.CharField(required=False, allow_blank=True)

    def validate_username(self, value):
        user = self.context['request'].user
        if CustomUser.objects.filter(username__iexact=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError('This username is already taken.')
        return value

    def validate_email(self, value):
        user = self.context['request'].user
        value = value.lower().strip()
        if CustomUser.objects.filter(email__iexact=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value

    def update(self, instance, validated_data):
        # Email change — do NOT apply immediately; send verification to new address
        new_email = validated_data.pop('email', None)
        if new_email and new_email.lower() != instance.email.lower():
            # Lazy import avoids circular dependency
            from users.views import _send_verification
            ok, msg = _send_verification(instance, new_email=new_email.lower())
            if not ok:
                raise serializers.ValidationError({'email': msg})
            instance.pending_email = new_email.lower()
            instance.email_verified = False
            instance.save(update_fields=['pending_email', 'email_verified'])

        # Update other CustomUser fields directly
        user_fields = [f for f in ('name', 'mobile', 'username') if f in validated_data]
        for field in user_fields:
            setattr(instance, field, validated_data[field])
        if user_fields:
            instance.save(update_fields=user_fields)

        # Update StudentProfile fields
        profile_fields = ('avatar_url', 'class_grade', 'board')
        profile_data = {f: validated_data[f] for f in profile_fields if f in validated_data}
        if profile_data and hasattr(instance, 'profile'):
            for field, val in profile_data.items():
                setattr(instance.profile, field, val)
            instance.profile.save(update_fields=list(profile_data.keys()))

        return instance


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    name = serializers.CharField(max_length=150, required=True)
    mobile = serializers.CharField(max_length=15, required=False, allow_blank=True)
    class_grade = serializers.CharField(write_only=True, required=False, allow_blank=True)
    board = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = CustomUser
        fields = ('name', 'username', 'mobile', 'email', 'password', 'role', 'class_grade', 'board')

    def validate_mobile(self, value):
        return validate_mobile(value)

    def validate_password(self, value):
        return validate_password_strength(value)

    def validate_email(self, value):
        value = value.lower().strip()
        if CustomUser.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                'An account with this email already exists.'
            )
        return value

    def validate_username(self, value):
        if CustomUser.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError(
                'This username is already taken. Please choose another.'
            )
        return value

    def create(self, validated_data):
        class_grade = validated_data.pop('class_grade', '')
        board = validated_data.pop('board', '')

        # is_active=False — account locked until email is verified
        user = CustomUser.objects.create_user(
            username=validated_data['username'],
            name=validated_data.get('name', ''),
            mobile=validated_data.get('mobile', ''),
            email=validated_data['email'],
            password=validated_data['password'],
            role=validated_data.get('role', 'student'),
            is_active=False,
        )

        if user.role == 'student':
            profile = user.profile
            if class_grade:
                profile.class_grade = class_grade
            if board:
                profile.board = board
            profile.save()

        # Closed-test convenience: skip email verification entirely so testers
        # can register and log in immediately. Off by default (normal prod flow).
        if getattr(settings, 'AUTO_VERIFY_USERS', False):
            user.is_active = True
            user.email_verified = True
            user.save(update_fields=['is_active', 'email_verified'])
            return user

        # Generate verification token and send email immediately
        token_obj = EmailVerificationToken.objects.create(
            user=user,
            token=secrets.token_urlsafe(64),
            expires_at=timezone.now() + timedelta(hours=24),
        )
        verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token_obj.token}"
        send_mail(
            subject='Verify your Envirr email address',
            message=(
                f"Hi {user.username},\n\n"
                f"Welcome to Envirr! Click the link below to verify your email "
                f"and activate your account. This link expires in 24 hours.\n\n"
                f"{verify_url}\n\n"
                f"If you didn't create this account, ignore this email.\n\n"
                f"— The Envirr Team"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )

        return user
