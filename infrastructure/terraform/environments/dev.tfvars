# TaxSorted.io Development Environment Configuration

environment = "dev"
aws_region  = "eu-west-2"

# VPC Configuration
vpc_cidr              = "10.0.0.0/16"
public_subnet_cidrs   = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs  = ["10.0.10.0/24", "10.0.11.0/24"]
database_subnet_cidrs = ["10.0.20.0/24", "10.0.21.0/24"]
enable_nat_gateway    = false  # Save costs in dev

# Aurora Configuration - minimal for development
database_name       = "taxsorted"
database_username   = "taxsorted_admin"
aurora_min_capacity = 0.5  # Minimum possible
aurora_max_capacity = 2    # Limited for cost control
