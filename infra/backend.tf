terraform {
  backend "s3" {
    bucket         = "atena-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "sa-east-1"
    encrypt        = true
    dynamodb_table = "atena-terraform-lock"
  }
}
