#!/bin/bash
set -e

# Configuración básica
REGION="eu-west-1"
FUNCTION_NAME="AjedrezMaestroApi"

echo "=========================================================="
echo "🚀 ACTUALIZANDO SÓLO API / DASHBOARD"
echo "=========================================================="

# 1. Empaquetar la Lambda
echo "📦 Compilando y empaquetando Lambda del API..."
cd alexa-skill/api-lambda
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

# 3. Limpiar configuración de CORS en API Gateway (se delega a la Lambda)
echo "🌐 Asegurando que API Gateway delega CORS a la Lambda..."
API_ID=$(aws apigatewayv2 get-apis --query "Items[?Name=='AjedrezMaestroHttpApi'].ApiId | [0]" --output text)

if [ "$API_ID" != "None" ]; then
    aws apigatewayv2 update-api \
        --region $REGION \
        --api-id $API_ID \
        --cors-configuration "{}" >/dev/null
    
    API_URL="https://${API_ID}.execute-api.${REGION}.amazonaws.com/api"
    echo "🎯 API_URL para GitHub Actions: $API_URL"
else
    echo "⚠️ No se encontró la API HTTP 'AjedrezMaestroHttpApi'. Ejecuta el script general primero."
fi

echo "=========================================================="
echo "✅ ACTUALIZACIÓN DE API COMPLETADA"
echo "=========================================================="
