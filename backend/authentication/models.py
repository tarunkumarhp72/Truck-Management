from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('driver', 'Driver'),
    ]
    
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='driver')
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    is_active_duty = models.BooleanField(default=False)  # For drivers
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.username} ({self.role})"

    class Meta:
        db_table = 'auth_users'
