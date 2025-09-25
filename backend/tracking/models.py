from django.db import models
from django.conf import settings

class Truck(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('maintenance', 'Under Maintenance'),
    ]
    
    truck_number = models.CharField(max_length=20, unique=True)
    license_plate = models.CharField(max_length=15, unique=True)
    model = models.CharField(max_length=50)
    driver = models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        limit_choices_to={'role': 'driver'}
    )
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='inactive')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Truck {self.truck_number} - {self.license_plate}"

    class Meta:
        db_table = 'trucks'

class Location(models.Model):
    truck = models.ForeignKey(Truck, on_delete=models.CASCADE, related_name='locations')
    driver = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        limit_choices_to={'role': 'driver'}
    )
    latitude = models.DecimalField(max_digits=10, decimal_places=7)
    longitude = models.DecimalField(max_digits=10, decimal_places=7)
    speed = models.FloatField(default=0.0)  # km/h
    heading = models.FloatField(default=0.0)  # degrees
    accuracy = models.FloatField(default=0.0)  # meters
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.truck.truck_number} - {self.latitude}, {self.longitude} at {self.timestamp}"

    class Meta:
        db_table = 'locations'
        ordering = ['-timestamp']

class DeliveryRoute(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    truck = models.ForeignKey(Truck, on_delete=models.CASCADE, related_name='routes')
    driver = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        limit_choices_to={'role': 'driver'}
    )
    start_location = models.CharField(max_length=200)
    end_location = models.CharField(max_length=200)
    start_latitude = models.DecimalField(max_digits=10, decimal_places=7)
    start_longitude = models.DecimalField(max_digits=10, decimal_places=7)
    end_latitude = models.DecimalField(max_digits=10, decimal_places=7)
    end_longitude = models.DecimalField(max_digits=10, decimal_places=7)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Route for {self.truck.truck_number}: {self.start_location} → {self.end_location}"

    class Meta:
        db_table = 'delivery_routes'
        ordering = ['-created_at']
