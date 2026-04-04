#!/bin/bash
set -e

echo "=========================================================="
echo "🚀 INICIANDO DESPLIEGUE EN AWS CLOUDSHELL"
echo "=========================================================="

REGION="eu-west-1"

# 1. Clonar el repositorio
echo "📥 Clonando repositorio..."
rm -rf chess
git clone https://github.com/cancargol/chess.git
cd chess

# 2. Crear las tablas de DynamoDB (ignora el error si ya existen)
echo "🗄️ Creando tablas de DynamoDB..."
aws dynamodb create-table \
    --region $REGION \
    --table-name ajedrez_maestro_users \
    --attribute-definitions AttributeName=id,AttributeType=S AttributeName=name_lower,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --global-secondary-indexes '[{"IndexName": "name_lower-index","KeySchema": [{"AttributeName": "name_lower","KeyType": "HASH"}],"Projection": {"ProjectionType": "ALL"}}]' \
    --billing-mode PAY_PER_REQUEST >/dev/null 2>&1 || echo "Tabla users ya existe."

aws dynamodb create-table \
    --region $REGION \
    --table-name ajedrez_maestro_games \
    --attribute-definitions AttributeName=id,AttributeType=S AttributeName=player_id,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --global-secondary-indexes '[{"IndexName": "player_id-index","KeySchema": [{"AttributeName": "player_id","KeyType": "HASH"}],"Projection": {"ProjectionType": "ALL"}}]' \
    --billing-mode PAY_PER_REQUEST >/dev/null 2>&1 || echo "Tabla games ya existe."

# 3. Crear Role IAM para Lambda (permiso a CloudWatch y DynamoDB Full Access)
echo "🔐 Configurando permisos IAM..."
cat << 'POLICY' > trust-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
POLICY

ROLE_ARN=$(aws iam create-role --role-name AjedrezMaestroRole --assume-role-policy-document file://trust-policy.json --query 'Role.Arn' --output text 2>/dev/null || aws iam get-role --role-name AjedrezMaestroRole --query 'Role.Arn' --output text)

aws iam attach-role-policy --role-name AjedrezMaestroRole --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam attach-role-policy --role-name AjedrezMaestroRole --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess

echo "Esperando 10s a que el Role se propague..."
sleep 10

# 4. Crear Lambda Alexa Skill
echo "📦 Compilando y subiendo Lambda de Alexa..."
cd alexa-skill/lambda
npm install --omit=dev >/dev/null 2>&1
# REDUCIR TAMAÑO: quitamos aws-sdk que ya viene en la lambda runtime de AWS
rm -rf node_modules/@aws-sdk
# REDUCIR TAMAÑO: quitamos archivos .nnue pesados (~45MB) que no son críticos para niveles bajos/medios
find node_modules/stockfish -name "*.nnue" -type f -delete
# REDUCIR TAMAÑO: quitamos versiones de stockfish que no usaremos (solo dejamos la single-threaded)
rm -f node_modules/stockfish/stockfish-nnue-16-no-Worker.js
rm -f node_modules/stockfish/stockfish-nnue-16-no-Worker.wasm
rm -f node_modules/stockfish/stockfish-nnue-16-no-simd.js
rm -f node_modules/stockfish/stockfish-nnue-16-no-simd.wasm
rm -f node_modules/stockfish/stockfish-nnue-16.js
rm -f node_modules/stockfish/stockfish-nnue-16.wasm
# Evitar que incluya otro function.zip recursivamente y limpiarlo primero
rm -f function.zip
zip -qr function.zip .
ALEXA_LAMBDA_ARN=$(aws lambda create-function \
    --region $REGION \
    --function-name AjedrezMaestroSkill \
    --runtime nodejs18.x \
    --role $ROLE_ARN \
    --handler index.handler \
    --timeout 30 \
    --memory-size 1024 \
    --environment "Variables={USERS_TABLE=ajedrez_maestro_users,GAMES_TABLE=ajedrez_maestro_games}" \
    --zip-file fileb://function.zip \
    --query 'FunctionArn' --output text 2>/dev/null || \
    aws lambda update-function-code \
    --region $REGION \
    --function-name AjedrezMaestroSkill \
    --zip-file fileb://function.zip \
    --query 'FunctionArn' --output text)

# Dar permisos a Alexa para invocar la lambda
aws lambda add-permission \
    --region $REGION \
    --function-name AjedrezMaestroSkill \
    --statement-id AlexaInvokePermission \
    --action lambda:InvokeFunction \
    --principal alexa-appkit.amazon.com >/dev/null 2>&1 || echo "Permisos de Alexa ya configurados."

# 5. Crear Lambda API Gateway
echo "📦 Compilando y subiendo Lambda del API (Dashboard)..."
cd ../api-lambda
npm install --omit=dev >/dev/null 2>&1
# REDUCIR TAMAÑO
rm -rf node_modules/@aws-sdk
rm -f function.zip
zip -qr function.zip .
API_LAMBDA_ARN=$(aws lambda create-function \
    --region $REGION \
    --function-name AjedrezMaestroApi \
    --runtime nodejs18.x \
    --role $ROLE_ARN \
    --handler index.handler \
    --timeout 15 \
    --memory-size 512 \
    --environment "Variables={USERS_TABLE=ajedrez_maestro_users,GAMES_TABLE=ajedrez_maestro_games}" \
    --zip-file fileb://function.zip \
    --query 'FunctionArn' --output text 2>/dev/null || \
    aws lambda update-function-code \
    --region $REGION \
    --function-name AjedrezMaestroApi \
    --zip-file fileb://function.zip \
    --query 'FunctionArn' --output text)

# 6. Crear API Gateway HTTP API
echo "🌐 Configurando API Gateway..."
API_ID=$(aws apigatewayv2 create-api \
    --region $REGION \
    --name AjedrezMaestroHttpApi \
    --protocol-type HTTP \
    --target $API_LAMBDA_ARN \
    --cors-configuration "AllowOrigins=['*'],AllowMethods=['GET','POST','OPTIONS'],AllowHeaders=['Content-Type','Authorization']" \
    --query 'ApiId' --output text 2>/dev/null)

# Si ya existe, podemos buscar la id
if [ -z "$API_ID" ]; then
    API_ID=$(aws apigatewayv2 get-apis --query "Items[?Name=='AjedrezMaestroHttpApi'].ApiId | [0]" --output text)
fi

aws lambda add-permission \
    --region $REGION \
    --function-name AjedrezMaestroApi \
    --statement-id apigateway-invoke \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:*:$API_ID/*" >/dev/null 2>&1 || true

API_URL="https://${API_ID}.execute-api.${REGION}.amazonaws.com/api"

echo ""
echo "=========================================================="
echo "✅ DESPLIEGUE AWS COMPLETADO"
echo "=========================================================="
echo "🎯 1. Para la Consola VENDEDOR ALEXA (Endpoint ARN):"
echo "-> $ALEXA_LAMBDA_ARN"
echo ""
echo "🎯 2. Para GITHUB PAGES (Añadir a Repository Variables > API_URL):"
echo "-> $API_URL"
echo "=========================================================="
