
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🔍 Buscando últimos 10 logs de Webhook...\n')

    const logs = await prisma.webhookLog.findMany({
        take: 10,
        orderBy: {
            createdAt: 'desc'
        }
    })

    if (logs.length === 0) {
        console.log('❌ Nenhum log encontrado. O Webhook ainda não recebeu requisições.')
    } else {
        logs.forEach((log) => {
            console.log('--------------------------------------------------')
            console.log(`📅 Data: ${log.createdAt.toLocaleString()}`)
            console.log(`📡 Status: ${log.status}`)
            if (log.error) console.log(`❌ Erro: ${log.error}`)
            console.log('📦 Payload:')
            console.dir(log.payload, { depth: null, colors: true })
        })
        console.log('--------------------------------------------------')
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
