import sql from 'mssql';
export declare function getSqlPool(): Promise<sql.ConnectionPool>;
export declare function testDatabaseConnection(): Promise<void>;
