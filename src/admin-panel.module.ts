/* eslint-disable @typescript-eslint/no-unused-vars */
import {
	applyDecorators,
	BadRequestException,
	Body,
	Controller,
	Delete,
	DynamicModule,
	Get,
	Inject,
	Module,
	Param,
	Patch,
	Post,
	Provider,
	Query,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { BaseDMMF, DMMF } from '@prisma/client/runtime/library';
import { AdminPanelService } from './admin-panel.service';
import { IAdminPanelFindMany } from './admin-panel.types';

interface IAdminPanelModuleAsyncOptions {
	basePath?: string;
	PrismaDMMF: BaseDMMF;
	imports?: any[];
	injects?: any[];
	controllerDecorators?: { decorators: MethodDecorator[]; include?: (string | RegExp)[]; exclude?: (string | RegExp)[] }[];
	filterControllers?: (model: DMMF.Datamodel['models'][number]) => boolean;
	serviceCatchHandler?: (error: unknown) => never;
	tablesPath?: string;
}

@Module({})
export class AdminPanelModule {
	static forRootAsync(options: IAdminPanelModuleAsyncOptions): DynamicModule {
		const {
			PrismaDMMF,
			basePath,
			controllerDecorators,
			filterControllers = () => true,
			imports = [],
			injects = [],
			serviceCatchHandler,
			tablesPath,
		} = options;
		// Получаем модели из Prisma
		const models = PrismaDMMF.datamodel.models;
		// Динамически создаем провайдеры для сервисов и контроллеров
		const providers: Provider[] = models.filter(filterControllers).map((model) => {
			const modelName = model.name[0].toLowerCase() + model.name.slice(1);

			return {
				provide: `${modelName}Service`,
				useFactory: (prismaService: PrismaClient) => new AdminPanelService(prismaService, model, serviceCatchHandler),
				inject: injects,
			};
		});

		const controllers = models.filter(filterControllers).map((model) => {
			return this.createController(model, basePath, controllerDecorators || []);
		});

		const TablesController = AdminPanelModule.createDbTablesController(tablesPath, basePath);
		const ClassTestService = AdminPanelModule.createDbTablesService(tablesPath, basePath);
		const TablesService = new ClassTestService(models);

		return {
			module: AdminPanelModule,
			imports: imports || [],
			controllers: [...controllers, TablesController],
			providers: [...injects, { provide: 'AdminPanelDbTablesService', useValue: TablesService }, ...providers],
		};
	}

	// Метод для создания контроллеров
	private static createController(
		model: DMMF.Datamodel['models'][number],
		basePath: string = '',
		decorators: IAdminPanelModuleAsyncOptions['controllerDecorators'],
	) {
		const modelName = model.name[0].toLowerCase() + model.name.slice(1);
		const currentDecorators = decorators
			.filter((dec) => {
				if (
					dec.include &&
					dec.include.find((item) => {
						if (typeof item === 'string') {
							return item === modelName;
						}
						return !!modelName.match(item);
					})
				) {
					return true;
				}

				if (
					dec.exclude &&
					dec.exclude.find((item) => {
						if (typeof item === 'string') {
							return item === modelName;
						}
						return !!modelName.match(item);
					})
				) {
					return false;
				}

				return true;
			})
			.map((item) => item.decorators)
			.flat(2);

		const Decorators = applyDecorators(...currentDecorators);
		@Controller(basePath + '/' + modelName) // Маршруты будут соответствовать имени модели
		class DynamicAdminPanelController {
			constructor(@Inject(`${modelName}Service`) private readonly service: AdminPanelService) {}

			@Get('fields')
			@Decorators
			getFields() {
				return this.service.getFields();
			}

			@Post()
			@Decorators
			create(@Body() data: any) {
				return this.service.create(data);
			}

			@Post('many')
			@Decorators
			createMany(@Body() data: any[]) {
				return this.service.createMany(data);
			}

			@Get()
			@Decorators
			findMany(@Query('filters') filters: string) {
				try {
					let parsedFilters: IAdminPanelFindMany = { page: 1, pageSize: 50 };
					try {
						parsedFilters = JSON.parse(filters);
					} catch (_) {}
					const { page = 1, pageSize = 50, orderBy = [], where = {} } = parsedFilters;
					return this.service.findMany(page || 1, pageSize || 50, orderBy, where);
				} catch (error) {
					throw new BadRequestException(error);
				}
			}

			@Get(':id')
			@Decorators
			findOne(@Param('id') id: string, @Query('fieldName') fieldName: string) {
				return this.service.findOne(fieldName || 'id', id);
			}

			@Patch(':id')
			@Decorators
			update(@Param('id') id: string, @Query('fieldName') fieldName: string, @Body() data: any) {
				return this.service.update(fieldName || 'id', id, data);
			}

			@Patch('many/:id')
			@Decorators
			updateMany(@Param('id') id: string, @Query('fieldName') fieldName: string, @Body() data: any[]) {
				return this.service.updateMany(fieldName || 'id', id, data);
			}

			@Delete(':id')
			@Decorators
			remove(@Param('id') id: string, @Query('fieldName') fieldName: string) {
				return this.service.remove(fieldName || 'id', id);
			}

			@Delete('many')
			@Decorators
			removeMany(@Body() data: any[], @Query('fieldName') fieldName: string) {
				return this.service.removeMany(fieldName || 'id', data);
			}
		}

		Reflect.defineMetadata('name', `${modelName}Controller`, DynamicAdminPanelController);

		return DynamicAdminPanelController;
	}

	private static createDbTablesController(tablesPath: string = 'db-tables', basePath: string = '') {
		@Controller(basePath + '/' + tablesPath) // Маршруты будут соответствовать имени модели
		class AdminPanelDbTablesController {
			constructor(@Inject('AdminPanelDbTablesService') private readonly adminPanelDbTablesService: any) {}

			@Get('list')
			getTableList() {
				return this.adminPanelDbTablesService.getTableList();
			}

			@Get('count')
			getTablesCount() {
				return this.adminPanelDbTablesService.getTablesCount();
			}
		}

		return AdminPanelDbTablesController;
	}

	private static createDbTablesService(tablesPath: string = 'db-tables', basePath: string = '') {
		@Controller(basePath + '/' + tablesPath) // Маршруты будут соответствовать имени модели
		class AdminPanelDbTablesService {
			constructor(private readonly models: DMMF.Datamodel['models']) {}

			getTableList() {
				return this.models.map((table) => ({ dbName: table.dbName, name: table.name, documentation: table.documentation }));
			}
			getTablesCount() {
				return this.models.length;
			}
		}

		return AdminPanelDbTablesService;
	}
}
