# nestjs-admin-prisma-panel

The module generates endpoints for prisma orm in nest js

```ts
		AdminPanelModule.forRootAsync({
			basePath: 'admin',
			PrismaDMMF: Prisma.dmmf,
			injects: [PrismaService],
		}),
```
