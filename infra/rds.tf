################################################################################
# RDS PostgreSQL 16
################################################################################

resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db-subnet"
  subnet_ids = aws_subnet.private[*].id

  tags = { Name = "${local.name_prefix}-db-subnet" }
}

resource "aws_db_parameter_group" "pg16" {
  name   = "${local.name_prefix}-pg16"
  family = "postgres16"

  tags = { Name = "${local.name_prefix}-pg16-params" }
}

resource "random_password" "db_password" {
  length  = 32
  special = false
}

resource "aws_db_instance" "main" {
  identifier = "${local.name_prefix}-db"

  engine         = "postgres"
  engine_version = "16"
  instance_class = var.db_instance_class

  allocated_storage = var.db_allocated_storage
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = "atena"
  username = "atena"
  password = random_password.db_password.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  parameter_group_name   = aws_db_parameter_group.pg16.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  multi_az            = false
  publicly_accessible = false

  backup_retention_period   = var.db_backup_retention
  backup_window             = "03:00-04:00"
  maintenance_window        = "sun:04:00-sun:05:00"
  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "${local.name_prefix}-db-final"

  tags = { Name = "${local.name_prefix}-db" }
}
