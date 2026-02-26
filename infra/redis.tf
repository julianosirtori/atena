################################################################################
# ElastiCache Redis 7
################################################################################

resource "aws_elasticache_subnet_group" "main" {
  name       = "${local.name_prefix}-redis-subnet"
  subnet_ids = aws_subnet.private[*].id

  tags = { Name = "${local.name_prefix}-redis-subnet" }
}

resource "aws_elasticache_parameter_group" "redis7" {
  name   = "${local.name_prefix}-redis7"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  tags = { Name = "${local.name_prefix}-redis7-params" }
}

resource "aws_elasticache_cluster" "main" {
  cluster_id = "${local.name_prefix}-redis"

  engine               = "redis"
  engine_version       = "7.1"
  node_type            = var.redis_node_type
  num_cache_nodes      = 1
  parameter_group_name = aws_elasticache_parameter_group.redis7.name
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]

  port = 6379

  tags = { Name = "${local.name_prefix}-redis" }
}
