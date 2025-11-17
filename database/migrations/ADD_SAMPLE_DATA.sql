-- Add sample sellers data
INSERT INTO public.farmers (full_name, phone, email, business_name, location, status) VALUES
('John Doe', '9841234567', 'john@cropsay.com', 'Fresh Farms', 'Kathmandu', 'approved'),
('Jane Smith', '9851234568', 'jane@cropsay.com', 'Organic Valley', 'Pokhara', 'approved'),
('Ram Sharma', '9861234569', 'ram@cropsay.com', 'Mountain Produce', 'Chitwan', 'pending');

-- Add sample applications
INSERT INTO public.farmer_applications (full_name, phone, email, business_name, location, message) VALUES
('Test Farmer', '9871234570', 'test@example.com', 'Test Farm', 'Lalitpur', 'I want to sell organic vegetables'),
('Another Farmer', '9881234571', 'another@example.com', 'Green Farm', 'Bhaktapur', 'Looking to join your platform');