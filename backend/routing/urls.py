from django.urls import path
from routing.views import CalculateRoutesAPIView, GeocodeSearchAPIView, PresetRoutesAPIView

urlpatterns = [
    path('calculate/', CalculateRoutesAPIView.as_view(), name='calculate-routes'),
    path('geocode/', GeocodeSearchAPIView.as_view(), name='geocode-search'),
    path('presets/', PresetRoutesAPIView.as_view(), name='preset-routes'),
]
