# TaxSorted.io AWS Infrastructure
# Terraform configuration for Aurora Serverless v2 PostgreSQL

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  # Remote state storage
  # Uncomment and configure for production
  # backend "s3" {
  #   bucket         = "taxsorted-terraform-state"
  #   key            = "infrastructure/terraform.tfstate"
  #   region         = "eu-west-2"
  #   encrypt        = true
  #   dynamodb_table = "terraform-state-lock"
  # }
}

# AWS Provider Configuration
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "TaxSorted"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

# Local variables
locals {
  name_prefix = "taxsorted-${var.environment}"
  common_tags = {
    Project     = "TaxSorted"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  azs = slice(data.aws_availability_zones.available.names, 0, 2)
}

#------------------------------------------------------------------------------
# VPC Configuration
#------------------------------------------------------------------------------

module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${local.name_prefix}-vpc"
  cidr = var.vpc_cidr

  azs              = local.azs
  private_subnets  = var.private_subnet_cidrs
  public_subnets   = var.public_subnet_cidrs
  database_subnets = var.database_subnet_cidrs

  create_database_subnet_group       = true
  create_database_subnet_route_table = true

  enable_nat_gateway     = var.enable_nat_gateway
  single_nat_gateway     = var.environment != "prod"
  one_nat_gateway_per_az = var.environment == "prod"

  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = local.common_tags

  database_subnet_tags = {
    Type = "database"
  }

  private_subnet_tags = {
    Type = "private"
  }

  public_subnet_tags = {
    Type = "public"
  }
}

#------------------------------------------------------------------------------
# Security Groups
#------------------------------------------------------------------------------

# Security group for application access to database
resource "aws_security_group" "app" {
  name        = "${local.name_prefix}-app-sg"
  description = "Security group for application servers"
  vpc_id      = module.vpc.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-app-sg"
  })
}

#------------------------------------------------------------------------------
# Aurora Serverless v2 Database
#------------------------------------------------------------------------------

module "aurora" {
  source = "../../../../ecosystem/infrastructure/_devops/terraform/modules/rds-aurora"

  name                 = local.name_prefix
  vpc_id               = module.vpc.vpc_id
  db_subnet_group_name = module.vpc.database_subnet_group_name

  # Security
  allowed_security_group_ids = [aws_security_group.app.id]
  allowed_cidr_blocks        = []

  # Capacity - conservative for startup
  min_capacity = var.aurora_min_capacity
  max_capacity = var.aurora_max_capacity

  # Database
  database_name   = var.database_name
  master_username = var.database_username

  # Availability
  instance_count      = var.environment == "prod" ? 2 : 1
  deletion_protection = var.environment == "prod"

  # Backups
  backup_retention_period = var.environment == "prod" ? 7 : 1
  skip_final_snapshot     = var.environment != "prod"

  # Monitoring
  performance_insights_enabled   = true
  enhanced_monitoring_interval   = var.environment == "prod" ? 60 : 0

  tags = local.common_tags
}

#------------------------------------------------------------------------------
# CloudWatch Alarms
#------------------------------------------------------------------------------

resource "aws_sns_topic" "alerts" {
  name = "${local.name_prefix}-alerts"
  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "aurora_cpu_high" {
  count = var.environment == "prod" ? 1 : 0

  alarm_name          = "${local.name_prefix}-aurora-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Aurora CPU utilization exceeds 80%"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBClusterIdentifier = module.aurora.cluster_id
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "aurora_connections_high" {
  count = var.environment == "prod" ? 1 : 0

  alarm_name          = "${local.name_prefix}-aurora-high-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Aurora database connections exceed threshold"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBClusterIdentifier = module.aurora.cluster_id
  }

  tags = local.common_tags
}
