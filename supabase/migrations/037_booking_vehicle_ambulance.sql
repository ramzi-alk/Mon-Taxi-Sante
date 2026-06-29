-- Add 'ambulance' to the booking vehicle type enum so patients requiring
-- stretcher transport can select an ambulance during booking.
ALTER TYPE public.booking_vehicle_type ADD VALUE IF NOT EXISTS 'ambulance';
