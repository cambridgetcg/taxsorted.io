# TaxSorted.io Terraform Variables

#------------------------------------------------------------------------------
# General Configuration
#------------------------------------------------------------------------------

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "eu-west-2"  # London - optimal for UK tax compliance
}

#------------------------------------------------------------------------------
# VPC Configuration
#------------------------------------------------------------------------------

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

variable "database_subnet_cidrs" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.0.20.0/24", "10.0.21.0/24"]
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnet internet access"
  type        = bool
  default     = true
}

#------------------------------------------------------------------------------
# Aurora Database Configuration
#------------------------------------------------------------------------------

variable "database_name" {
  description = "Name of the database to create"
  type        = string
  default     = "taxsorted"
}

variable "database_username" {
  description = "Master username for the database"
  type        = string
  default     = "taxsorted_admin"
}

variable "aurora_min_capacity" {
  description = "Minimum ACU capacity for Aurora Serverless v2"
  type        = number
  default     = 0.5

  validation {
    condition     = var.aurora_min_capacity >= 0.5 && var.aurora_min_capacity <= 128
    error_message = "Aurora min capacity must be between 0.5 and 128 ACUs."
  }
}

variable "aurora_max_capacity" {
  description = "Maximum ACU capacity for Aurora Serverless v2"
  type        = number
  default     = 4

  validation {
    condition     = var.aurora_max_capacity >= 0.5 && var.aurora_max_capacity <= 128
    error_message = "Aurora max capacity must be between 0.5 and 128 ACUs."
  }
}
