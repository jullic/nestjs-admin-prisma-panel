export interface IAdminPanelFindMany {
	page: number;
	pageSize: number;
	where?: {
		AND?: (Record<string, any> & IAdminPanelFindMany['where'])[];
		OR?: (Record<string, any> & IAdminPanelFindMany['where'])[];
		NOT?: (Record<string, any> & IAdminPanelFindMany['where'])[];
	};
	orderBy?: Record<string, 'asc' | 'desc'>[];
}
