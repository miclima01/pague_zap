import { prisma } from '../src/lib/prisma';
import axios from 'axios';

async function main() {
  console.log('🚀 Iniciando teste do Cron Job...');

  // 1. Criar usuário de teste se não existir
  let user = await prisma.user.findFirst({
    where: { email: 'test_cron@example.com' }
  });

  if (!user) {
    console.log('Criando usuário de teste...');
    user = await prisma.user.create({
      data: {
        email: 'test_cron@example.com',
        password: 'hash_placeholder',
        name: 'Cron Tester',
        whatsappPhoneNumberId: 'test_phone_id',
        whatsappToken: 'test_token',
        merchantName: 'Test Merchant',
        pixKey: 'test_key',
        pixKeyType: 'EVP'
      }
    });
  }

  // 2. Criar uma cobrança agendada VENCIDA (data passada)
  const pastDate = new Date();
  pastDate.setMinutes(pastDate.getMinutes() - 10); // 10 minutos atrás

  console.log('Criando cobrança agendada para:', pastDate.toISOString());

  const charge = await prisma.charge.create({
    data: {
      userId: user.id,
      customerName: 'Cliente Teste',
      customerPhone: '5511999999999',
      amount: 100.00,
      description: 'Teste Cron',
      productName: 'Produto Teste',
      scheduleType: 'OneTime',
      status: 'SCHEDULED',
      nextSendDate: pastDate
    }
  });

  console.log(`Cobrança criada: ${charge.id}`);

  // 3. Trigger manual do Cron Job
  console.log('Disparando Cron Job...');
  try {
    const response = await axios.get('http://localhost:3000/api/cron/process-charges?key=paguezap_cron_secret');
    
    console.log('Resposta do Cron:', response.data);
  } catch (error: any) {
    console.error('Erro ao chamar cron:', error.response?.data || error.message);
  }

  // 4. Verificar resultado no banco
  const updatedCharge = await prisma.charge.findUnique({
    where: { id: charge.id }
  });

  console.log('Status final da cobrança:', updatedCharge?.status);
  
  // Como as credenciais de WhatsApp são fake, esperamos FAILED ou SENT (se o mock do whatsapp service for muito permissivo, mas provavelmente FAILED)
  if (updatedCharge?.status === 'SENT' || updatedCharge?.status === 'FAILED') {
    console.log('✅ Teste passou: Cobrança foi processada!');
  } else {
    console.error('❌ Teste falhou: Status não mudou de SCHEDULED');
  }

  // Limpeza (opcional, comentar se quiser inspecionar o banco)
  // await prisma.charge.delete({ where: { id: charge.id } });
  // await prisma.user.delete({ where: { id: user.id } });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
