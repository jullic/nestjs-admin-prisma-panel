import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DMMF } from '@prisma/client/runtime/library';
import { IAdminPanelFindMany } from './admin-panel.types';

@Injectable()
export class AdminPanelService {
	logger: Logger;
	private readonly modelName: string;

	constructor(
		private readonly prisma: PrismaClient,
		private readonly model: DMMF.Datamodel['models'][number],
		private readonly serviceCatchHandler: (error: unknown) => never,
	) {
		this.modelName = this.model.name[0].toLowerCase() + this.model.name.slice(1);
		this.logger = new Logger(AdminPanelService.name + ' ' + this.modelName);
	}

	private getRepository() {
		return this.prisma[this.modelName];
	}

	async getFields(): Promise<DMMF.Model['fields']> {
		return this.model.fields;
	}

	async create(data: any) {
		try {
			return await this.getRepository().create({ data });
		} catch (error) {
			this.logger.error(error);
			if (this.serviceCatchHandler) {
				this.serviceCatchHandler(error);
			}
			throw new BadRequestException();
		}
	}

	async createMany(data: any[]) {
		try {
			return await this.prisma.$transaction(
				data.map((item) =>
					this.getRepository().create({
						data: item,
					}),
				),
			);
		} catch (error) {
			this.logger.error(error);
			if (this.serviceCatchHandler) {
				this.serviceCatchHandler(error);
			}
			throw new BadRequestException();
		}
	}

	async findMany(page: number = 1, pageSize: number = 50, orderBy: IAdminPanelFindMany['orderBy'], where: IAdminPanelFindMany['where']) {
		const currentPage = page - 1 <= 0 ? 0 : page - 1;
		const skip = currentPage * pageSize;

		try {
			const records = this.getRepository().findMany({
				skip,
				take: pageSize,
				where,
				orderBy,
			});
			const counts = this.getRepository().count({ where });
			const [recordsResolved, countsResolved] = await Promise.all([records, counts]);

			return {
				data: recordsResolved,
				count: countsResolved,
				page,
				pageSize,
				totalPages: Math.ceil(countsResolved / pageSize),
			};
		} catch (error) {
			this.logger.error(error);
			if (this.serviceCatchHandler) {
				this.serviceCatchHandler(error);
			}
			throw new BadRequestException();
		}
	}

	async findOne(fieldName: string, fieldValue: any) {
		try {
			return await this.getRepository().findUniqueOrThrow({
				where: { [fieldName]: fieldValue },
			});
		} catch (error) {
			this.logger.error(error);
			if (this.serviceCatchHandler) {
				this.serviceCatchHandler(error);
			}
			throw new BadRequestException();
		}
	}

	async update(fieldName: string, fieldValue: any, data: any) {
		try {
			return await this.getRepository().update({
				where: { [fieldName]: fieldValue },
				data,
			});
		} catch (error) {
			this.logger.error(error);
			if (this.serviceCatchHandler) {
				this.serviceCatchHandler(error);
			}
			throw new BadRequestException();
		}
	}

	async updateMany(fieldName: string, fieldValue: any, data: any[]) {
		try {
			return await this.prisma.$transaction(
				data.map((item) =>
					this.getRepository().update({
						where: { [fieldName]: fieldValue },
						data: item,
					}),
				),
			);
		} catch (error) {
			this.logger.error(error);
			if (this.serviceCatchHandler) {
				this.serviceCatchHandler(error);
			}
			throw new BadRequestException();
		}
	}

	async remove(fieldName: string, fieldValue: any) {
		try {
			return await this.getRepository().delete({
				where: { [fieldName]: fieldValue },
			});
		} catch (error) {
			this.logger.error(error);
			if (this.serviceCatchHandler) {
				this.serviceCatchHandler(error);
			}
			throw new BadRequestException();
		}
	}

	async removeMany(fieldName: string, fieldValues: any[]) {
		try {
			return await this.prisma.$transaction(
				fieldValues.map((item) =>
					this.getRepository().delete({
						where: { [fieldName]: item },
					}),
				),
			);
		} catch (error) {
			this.logger.error(error);
			if (this.serviceCatchHandler) {
				this.serviceCatchHandler(error);
			}
			throw new BadRequestException();
		}
	}
}
