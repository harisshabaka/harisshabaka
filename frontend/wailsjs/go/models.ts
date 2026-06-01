export namespace logger {
	
	export class PaginatedLogsResponse {
	    logs: any[];
	    totalRows: number;
	    totalPages: number;
	    currentPage: number;
	
	    static createFrom(source: any = {}) {
	        return new PaginatedLogsResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.logs = source["logs"];
	        this.totalRows = source["totalRows"];
	        this.totalPages = source["totalPages"];
	        this.currentPage = source["currentPage"];
	    }
	}

}

export namespace process {
	
	export class ConnectionInfo {
	    protocol: string;
	    localIp: string;
	    localPort: number;
	    remoteIp: string;
	    remotePort: number;
	    status: string;
	
	    static createFrom(source: any = {}) {
	        return new ConnectionInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.protocol = source["protocol"];
	        this.localIp = source["localIp"];
	        this.localPort = source["localPort"];
	        this.remoteIp = source["remoteIp"];
	        this.remotePort = source["remotePort"];
	        this.status = source["status"];
	    }
	}
	export class CountryConnection {
	    countryCode: string;
	    countryName: string;
	    processes: string[];
	    ips: string[];
	    count: number;
	
	    static createFrom(source: any = {}) {
	        return new CountryConnection(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.countryCode = source["countryCode"];
	        this.countryName = source["countryName"];
	        this.processes = source["processes"];
	        this.ips = source["ips"];
	        this.count = source["count"];
	    }
	}
	export class NetworkConnectionsResponse {
	    public_ip: string;
	    public_ip_country_code: string;
	    public_ip_country_name: string;
	    connections: CountryConnection[];
	
	    static createFrom(source: any = {}) {
	        return new NetworkConnectionsResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.public_ip = source["public_ip"];
	        this.public_ip_country_code = source["public_ip_country_code"];
	        this.public_ip_country_name = source["public_ip_country_name"];
	        this.connections = this.convertValues(source["connections"], CountryConnection);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ProcessRow {
	    id: string;
	    status: string;
	    fileName: string;
	    processName: string;
	    pid: number;
	    path: string;
	    networkKbps: string;
	    signature: string;
	    isSigned: boolean;
	    remoteIp: string;
	    connections: number;
	    sha256: string;
	    icon: string;
	    networkType: string;
	    parentProcessName: string;
	    parentPid: number;
	    isServer: boolean;
	    listenPorts: number[];
	    connectionsDetails: ConnectionInfo[];
	
	    static createFrom(source: any = {}) {
	        return new ProcessRow(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.status = source["status"];
	        this.fileName = source["fileName"];
	        this.processName = source["processName"];
	        this.pid = source["pid"];
	        this.path = source["path"];
	        this.networkKbps = source["networkKbps"];
	        this.signature = source["signature"];
	        this.isSigned = source["isSigned"];
	        this.remoteIp = source["remoteIp"];
	        this.connections = source["connections"];
	        this.sha256 = source["sha256"];
	        this.icon = source["icon"];
	        this.networkType = source["networkType"];
	        this.parentProcessName = source["parentProcessName"];
	        this.parentPid = source["parentPid"];
	        this.isServer = source["isServer"];
	        this.listenPorts = source["listenPorts"];
	        this.connectionsDetails = this.convertValues(source["connectionsDetails"], ConnectionInfo);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

