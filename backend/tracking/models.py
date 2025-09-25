from django.db import models
from django.conf import settings

class Truck(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('maintenance', 'Under Maintenance'),
    ]
    
    TRUCK_TYPE_CHOICES = [
        ('mini', 'Mini Truck'),
        ('small', 'Small Truck'),
        ('medium', 'Medium Truck'),
        ('large', 'Large Truck'),
        ('heavy', 'Heavy Truck'),
    ]
    
    truck_number = models.CharField(max_length=20, unique=True)
    license_plate = models.CharField(max_length=15, unique=True)
    model = models.CharField(max_length=50)
    truck_type = models.CharField(max_length=15, choices=TRUCK_TYPE_CHOICES, default='small')
    capacity_tons = models.DecimalField(max_digits=5, decimal_places=2, default=1.0)
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

class RouteRequest(models.Model):
    """Route requests posted by admin for bidding"""
    STATUS_CHOICES = [
        ('open', 'Open for Bidding'),
        ('assigned', 'Assigned'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    MATERIAL_TYPE_CHOICES = [
        ('general', 'General Cargo'),
        ('oil', 'Oil & Petroleum'),
        ('gas', 'Gas'),
        ('chemical', 'Chemical'),
        ('food', 'Food Items'),
        ('construction', 'Construction Materials'),
        ('electronics', 'Electronics'),
        ('textiles', 'Textiles'),
        ('machinery', 'Machinery'),
        ('other', 'Other'),
    ]
    
    TRUCK_TYPE_CHOICES = [
        ('mini', 'Mini Truck'),
        ('small', 'Small Truck'),
        ('medium', 'Medium Truck'),
        ('large', 'Large Truck'),
        ('heavy', 'Heavy Truck'),
        ('any', 'Any Type'),
    ]
    
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    start_location = models.CharField(max_length=200)
    end_location = models.CharField(max_length=200)
    start_latitude = models.DecimalField(max_digits=10, decimal_places=7)
    start_longitude = models.DecimalField(max_digits=10, decimal_places=7)
    end_latitude = models.DecimalField(max_digits=10, decimal_places=7)
    end_longitude = models.DecimalField(max_digits=10, decimal_places=7)
    
    material_type = models.CharField(max_length=20, choices=MATERIAL_TYPE_CHOICES, default='general')
    required_truck_type = models.CharField(max_length=15, choices=TRUCK_TYPE_CHOICES, default='any')
    estimated_weight_tons = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    distance_km = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    
    budget_min = models.DecimalField(max_digits=10, decimal_places=2, help_text="Minimum budget in INR")
    budget_max = models.DecimalField(max_digits=10, decimal_places=2, help_text="Maximum budget in INR")
    
    pickup_deadline = models.DateTimeField(help_text="Latest pickup time")
    delivery_deadline = models.DateTimeField(help_text="Required delivery time")
    
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='open')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        limit_choices_to={'role': 'admin'},
        related_name='created_routes'
    )
    assigned_driver = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL,
        null=True, blank=True,
        limit_choices_to={'role': 'driver'},
        related_name='assigned_routes'
    )
    assigned_truck = models.ForeignKey(Truck, on_delete=models.SET_NULL, null=True, blank=True)
    winning_bid_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Route Request: {self.start_location} → {self.end_location}"

    class Meta:
        db_table = 'route_requests'
        ordering = ['-created_at']

class RouteBid(models.Model):
    """Bids placed by drivers on route requests"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('withdrawn', 'Withdrawn'),
    ]
    
    route_request = models.ForeignKey(RouteRequest, on_delete=models.CASCADE, related_name='bids')
    driver = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        limit_choices_to={'role': 'driver'}
    )
    truck = models.ForeignKey(Truck, on_delete=models.CASCADE)
    bid_amount = models.DecimalField(max_digits=10, decimal_places=2, help_text="Bid amount in INR")
    estimated_pickup_time = models.DateTimeField()
    estimated_delivery_time = models.DateTimeField()
    additional_notes = models.TextField(blank=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Bid by {self.driver.username} for ₹{self.bid_amount}"

    class Meta:
        db_table = 'route_bids'
        ordering = ['bid_amount']  # Show lowest bids first
        unique_together = ['route_request', 'driver']  # One bid per driver per route

class DeliveryRoute(models.Model):
    """Active delivery routes - created when a bid is accepted"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    route_request = models.OneToOneField(RouteRequest, on_delete=models.CASCADE, related_name='delivery_route')
    accepted_bid = models.OneToOneField(RouteBid, on_delete=models.CASCADE, related_name='delivery_route')
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
