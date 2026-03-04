// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import { ROLE_TEMPLATES } from '../src/lib/permissions' // Pfad ggf. anpassen

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starte Seeding...')

  // 1. Eine Demo-Organisation erstellen
  const orgName = "Forstbetrieb Demo"
  
  const org = await prisma.organization.upsert({
    where: { slug: "demo-forst" },
    update: {},
    create: {
      name: orgName,
      slug: "demo-forst",
      subscriptionStatus: "ACTIVE"
    }
  })

  console.log(`✅ Organisation erstellt: ${org.name}`)

  // 2. Rollen für diese Organisation anlegen
  // Da Rollen immer an einer Org hängen, müssen wir sie hier erstellen.
  
  for (const [key, template] of Object.entries(ROLE_TEMPLATES)) {
    await prisma.role.upsert({
      where: {
        name_organizationId: {
          name: template.name,
          organizationId: org.id
        }
      },
      update: {
        permissions: template.permissions // Rechte update, falls wir sie im Code geändert haben
      },
      create: {
        name: template.name,
        description: template.description,
        permissions: template.permissions,
        isSystemRole: true, // Systemrollen schützen wir vor Bearbeitung
        organizationId: org.id
      }
    })
    console.log(`   - Rolle erstellt/aktualisiert: ${template.name}`)
  }

  console.log('🏁 Seeding abgeschlossen.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })