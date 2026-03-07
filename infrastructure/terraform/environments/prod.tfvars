# TaxSorted.io Production Environment Configuration

environment = "prod"
aws_region  = "eu-west-2"  # London region for UK compliance

# VPC Configuration
vpc_cidr              = "10.1.0.0/16"  # Different CIDR from dev
public_subnet_cidrs   = ["10.1.1.0/24", "10.1.2.0/24"]
private_subnet_cidrs  = ["10.1.10.0/24", "10.1.11.0/24"]
database_subnet_cidrs = ["10.1.20.0/24", "10.1.21.0/24"]
enable_nat_gateway    = true

# Aurora Configuration - production ready
database_name       = "taxsorted"
database_username   = "taxsorted_admin"
aurora_min_capacity = 0.5  # Scale to near-zero during quiet periods
aurora_max_capacity = 4    # Start conservative, increase to 8-16 as needed
