from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from tracking.models import Truck, Location, DeliveryRoute
from datetime import datetime, timedelta
import random

User = get_user_model()

class Command(BaseCommand):
    help = 'Populate the database with sample data for testing'

    def handle(self, *args, **options):
        self.stdout.write('Creating sample data...')

        # Create sample users
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@example.com',
                'role': 'admin',
                'is_staff': True,
                'is_superuser': True,
            }
        )
        if created:
            admin_user.set_password('admin123')
            admin_user.save()
            self.stdout.write(f'Created admin user: admin / admin123')

        # Create sample drivers
        drivers = []
        for i in range(1, 4):
            driver, created = User.objects.get_or_create(
                username=f'driver{i}',
                defaults={
                    'email': f'driver{i}@example.com',
                    'role': 'driver',
                    'phone_number': f'555-010{i}',
                }
            )
            if created:
                driver.set_password('driver123')
                driver.save()
                self.stdout.write(f'Created driver: driver{i} / driver123')
            drivers.append(driver)

        # Create sample trucks
        truck_data = [
            {'truck_number': 'TRK001', 'license_plate': 'ABC123', 'model': 'Volvo FH16'},
            {'truck_number': 'TRK002', 'license_plate': 'DEF456', 'model': 'Mercedes Actros'},
            {'truck_number': 'TRK003', 'license_plate': 'GHI789', 'model': 'Scania R500'},
        ]

        trucks = []
        for i, data in enumerate(truck_data):
            truck, created = Truck.objects.get_or_create(
                truck_number=data['truck_number'],
                defaults={
                    'license_plate': data['license_plate'],
                    'model': data['model'],
                    'driver': drivers[i] if i < len(drivers) else None,
                    'status': 'active',
                }
            )
            if created:
                self.stdout.write(f'Created truck: {truck.truck_number}')
            trucks.append(truck)

        # Create sample delivery routes
        route_data = [
            {
                'start_location': 'New York, NY',
                'end_location': 'Philadelphia, PA',
                'start_lat': 40.7128, 'start_lng': -74.0060,
                'end_lat': 39.9526, 'end_lng': -75.1652,
            },
            {
                'start_location': 'Los Angeles, CA',
                'end_location': 'San Francisco, CA',
                'start_lat': 34.0522, 'start_lng': -118.2437,
                'end_lat': 37.7749, 'end_lng': -122.4194,
            },
            {
                'start_location': 'Chicago, IL',
                'end_location': 'Detroit, MI',
                'start_lat': 41.8781, 'start_lng': -87.6298,
                'end_lat': 42.3314, 'end_lng': -83.0458,
            },
        ]

        for i, data in enumerate(route_data):
            if i < len(trucks) and i < len(drivers):
                route, created = DeliveryRoute.objects.get_or_create(
                    truck=trucks[i],
                    driver=drivers[i],
                    start_location=data['start_location'],
                    end_location=data['end_location'],
                    defaults={
                        'start_latitude': data['start_lat'],
                        'start_longitude': data['start_lng'],
                        'end_latitude': data['end_lat'],
                        'end_longitude': data['end_lng'],
                        'status': 'in_progress' if i == 0 else 'pending',
                        'started_at': datetime.now() - timedelta(hours=2) if i == 0 else None,
                    }
                )
                if created:
                    self.stdout.write(f'Created route: {route.start_location} → {route.end_location}')

        # Note: No static location data created - only live tracking

        self.stdout.write(self.style.SUCCESS('Sample data created successfully!'))
        self.stdout.write('')
        self.stdout.write('Login credentials:')
        self.stdout.write('Admin: admin / admin123')
        self.stdout.write('Drivers: driver1 / driver123, driver2 / driver123, driver3 / driver123')
