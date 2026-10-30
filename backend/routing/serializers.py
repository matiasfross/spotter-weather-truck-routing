"""
Serializers for Route Planning API.
"""

from rest_framework import serializers
from datetime import datetime, timezone


class RouteCalculateRequestSerializer(serializers.Serializer):
    origin = serializers.CharField(
        required=True,
        help_text="Origin city, address, or lat,lon coordinates (e.g. 'Chicago, IL' or '41.8781,-87.6298')"
    )
    destination = serializers.CharField(
        required=True,
        help_text="Destination city, address, or lat,lon coordinates (e.g. 'Denver, CO' or '39.7392,-104.9903')"
    )
    departure_time = serializers.DateTimeField(
        required=False,
        default=lambda: datetime.now(timezone.utc),
        help_text="Departure timestamp in ISO 8601 format"
    )
    load_weight_lbs = serializers.FloatField(
        required=False,
        default=35000.0,
        min_value=0.0,
        max_value=95000.0,
        help_text="Truck cargo weight in pounds (standard US semi payload is 30,000-45,000 lbs)"
    )
    sampling_miles = serializers.ChoiceField(
        choices=[10, 25, 50],
        default=25,
        help_text="Checkpoint sampling frequency: 10, 25, or 50 miles"
    )


class GeocodeSearchSerializer(serializers.Serializer):
    q = serializers.CharField(required=True, min_length=2, help_text="Search query for autocomplete")
    limit = serializers.IntegerField(required=False, default=5, min_value=1, max_value=10)
