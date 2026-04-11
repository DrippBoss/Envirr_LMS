from rest_framework import serializers
from users.models import CustomUser, StudentProfile

class StudentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentProfile
        fields = ('class_grade', 'board', 'avatar_url')

class UserSerializer(serializers.ModelSerializer):
    profile = StudentProfileSerializer(read_only=True)

    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'email', 'role', 'profile')

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    class_grade = serializers.CharField(write_only=True, required=False, allow_blank=True)
    board = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = CustomUser
        fields = ('username', 'email', 'password', 'role', 'class_grade', 'board')
        
    def create(self, validated_data):
        class_grade = validated_data.pop('class_grade', '')
        board = validated_data.pop('board', '')
        
        user = CustomUser.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            role=validated_data.get('role', 'student')
        )
        
        if user.role == 'student':
            profile = user.profile
            if class_grade:
                profile.class_grade = class_grade
            if board:
                profile.board = board
            profile.save()
            
        return user
