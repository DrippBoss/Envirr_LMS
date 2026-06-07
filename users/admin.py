from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from users.models import CustomUser, BannedIP


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display  = ('username', 'email', 'role', 'is_active', 'failed_login_attempts')
    list_filter   = ('role', 'is_active')
    search_fields = ('username', 'email')
    fieldsets = UserAdmin.fieldsets + (
        ('Envirr', {'fields': ('role', 'can_build_courses', 'failed_login_attempts')}),
    )
    actions = ['unlock_accounts', 'lock_accounts']

    @admin.action(description='Unlock selected accounts (reset failed attempts)')
    def unlock_accounts(self, request, queryset):
        queryset.update(is_active=True, failed_login_attempts=0)

    @admin.action(description='Lock selected accounts')
    def lock_accounts(self, request, queryset):
        queryset.update(is_active=False)


@admin.register(BannedIP)
class BannedIPAdmin(admin.ModelAdmin):
    list_display  = ('ip_address', 'reason', 'banned_at', 'banned_by')
    search_fields = ('ip_address',)
    readonly_fields = ('banned_at',)

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.banned_by = request.user
        super().save_model(request, obj, form, change)
