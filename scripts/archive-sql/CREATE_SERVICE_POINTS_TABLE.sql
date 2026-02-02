-- Create the public.service_points table
CREATE TABLE IF NOT EXISTS public.service_points (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  township text,
  latitude double precision,
  longitude double precision,
  service_radius integer DEFAULT 0, -- Service radius in kilometers
  legal_entity text, -- Legal entity name
  status text DEFAULT 'active' NOT NULL, -- e.g., 'active', 'inactive', 'maintenance'
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add comments to the table and columns
COMMENT ON TABLE public.service_points IS 'Service points for operations, e.g., fuel stations, repair centers.';
COMMENT ON COLUMN public.service_points.id IS 'Unique identifier for the service point.';
COMMENT ON COLUMN public.service_points.name IS 'Name of the service point.';
COMMENT ON COLUMN public.service_points.township IS 'Township or administrative area of the service point.';
COMMENT ON COLUMN public.service_points.latitude IS 'Latitude coordinate of the service point.';
COMMENT ON COLUMN public.service_points.longitude IS 'Longitude coordinate of the service point.';
COMMENT ON COLUMN public.service_points.service_radius IS 'Service radius in kilometers around the service point.';
COMMENT ON COLUMN public.service_points.legal_entity IS 'Legal entity or company operating the service point.';
COMMENT ON COLUMN public.service_points.status IS 'Current operational status of the service point (e.g., active, inactive).';
COMMENT ON COLUMN public.service_points.created_at IS 'Timestamp when the service point record was created.';
COMMENT ON COLUMN public.service_points.updated_at IS 'Timestamp when the service point record was last updated.';

-- Create an index on name for faster lookups
CREATE INDEX IF NOT EXISTS service_points_name_idx ON public.service_points (name);

-- Create an index on status for filtering
CREATE INDEX IF NOT EXISTS service_points_status_idx ON public.service_points (status);

-- Create an index on location for geospatial queries
CREATE INDEX IF NOT EXISTS service_points_location_idx ON public.service_points (latitude, longitude);

-- Enable Row Level Security (RLS)
ALTER TABLE public.service_points ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy for authenticated users to read service points
CREATE POLICY "Allow authenticated users to read service points"
ON public.service_points FOR SELECT
TO authenticated
USING (true);

-- Policy for service role to manage service points (for admin operations)
CREATE POLICY "Allow service role to manage service points"
ON public.service_points FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Set up a trigger to automatically update the 'updated_at' column
CREATE OR REPLACE FUNCTION update_service_points_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS update_service_points_updated_at ON public.service_points;
CREATE TRIGGER update_service_points_updated_at
BEFORE UPDATE ON public.service_points
FOR EACH ROW
EXECUTE FUNCTION update_service_points_updated_at();

-- Insert some sample data (optional)
INSERT INTO public.service_points (name, township, latitude, longitude, service_radius, legal_entity, status)
VALUES 
  ('五华区服务点', '五华区', 25.0389, 102.7183, 15, '昆明市五华区燃料服务有限公司', 'active'),
  ('盘龙区服务点', '盘龙区', 25.0853, 102.7353, 12, '昆明市盘龙区能源服务有限公司', 'active')
ON CONFLICT DO NOTHING;

