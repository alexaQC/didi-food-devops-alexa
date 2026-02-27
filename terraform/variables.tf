variable "kubeconfig_path" {
  description = "Ruta al kubeconfig de k3d"
  type        = string
}

variable "namespace" {
  description = "Namespace del proyecto"
  type        = string
}

variable "release_name" {
  description = "Nombre del release de Helm"
  type        = string
}

variable "chart_path" {
  description = "Ruta al chart de Helm"
  type        = string
}

variable "image_registry" {
  description = "Registry interno del cluster"
  type        = string
}

variable "image_tag" {
  description = "Tag dinámico de las imágenes"
  type        = string
}

variable "backend_image" {
  type = string
}

variable "frontend_image" {
  type = string
}

variable "users_image" {
  type = string
}

variable "orders_image" {
  type = string
}

variable "payments_image" {
  type = string
}