#!/bin/bash
set -e

# Configuración básica
REGION="eu-west-1"
FUNCTION_NAME="AjedrezMaestroSkill"

echo "=========================================================="
echo "🚀 ACTUALIZANDO SÓLO SKILL / ALEXA"
echo "=========================================================="

# 1. Empaquetar la Lambda
echo "📦 Compilando y empaquetando Lambda de Alexa..."
cd alexa-skill/lambda
npm install --omit=dev >/dev/null 2>&1
rm -rf node_modules/@aws-sdk
rm -f function.zip
zip -qr function.zip .

# 2. Subir el código
echo "📤 Subiendo código a AWS Lambda ($FUNCTION_NAME)..."
aws lambda update-function-code \
    --region $REGION \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://function.zip \
    --query 'FunctionArn' --output text

echo "=========================================================="
echo "✅ ACTUALIZACIÓN DE SKILL COMPLETADA"
echo "=========================================================="
