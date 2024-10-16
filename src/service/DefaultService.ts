'use strict';

/**
 * Types
 */
export interface AuthenticationRequest {
  User: {
    name: string;
    isAdmin: boolean;
  };
  Secret: {
    password: string;
  };
}

export interface AuthenticationToken {
  token: string;
}

export interface PackageName {
  name: string;
}

export interface PackageID {
  id: string;
}

export interface PackageMetadata {
  Version: string;
  ID: string;
  Name: string;
}

export interface Package {
  metadata: PackageMetadata;
  data: {
    Content: string;
    debloat: boolean;
    JSProgram: string;
    URL: string;
  };
}

export interface PackageCost {
  standaloneCost: number;
  totalCost: number;
}

export interface PackageRating {
  GoodPinningPractice: number;
  CorrectnessLatency: number;
  PullRequestLatency: number;
  RampUpLatency: number;
  PullRequest: number;
  LicenseScore: number;
  BusFactorLatency: number;
  LicenseScoreLatency: number;
  GoodPinningPracticeLatency: number;
  Correctness: number;
  ResponsiveMaintainerLatency: number;
  NetScoreLatency: number;
  NetScore: number;
  ResponsiveMaintainer: number;
  RampUp: number;
  BusFactor: number;
}

export interface PackageQuery {
  Version: string;
  ID: string;
  Name: string;
}

/**
 * (NON-BASELINE)
 * Create an access token.
 *
 * @param body AuthenticationRequest 
 * @returns Promise<AuthenticationToken>
 */
export function createAuthToken(body: AuthenticationRequest): Promise<AuthenticationToken> {
  return new Promise(function(resolve, reject) {
    if (body) {
      const token = "bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      resolve({ token });
    } else {
      reject({
        message: "Missing required properties 'User' or 'Secret'",
        status: 400
      });
    }
  });
}
/*
Test body:
{
  "User": {
    "name": "ece30861defaultadminuser",
    "isAdmin": true
  },
  "Secret": {
    "password": "correcthorsebatterystaple123(!__+@**(A'\"`;DROP TABLE packages;"
  }
}
*/

/**
 * (NON-BASELINE)
 * Return the history of this package (all versions).
 *
 * @param name PackageName 
 * @param xAuthorization AuthenticationToken 
 * @returns Promise<Array<any>>
 */
export function packageByNameGet(name: PackageName, xAuthorization: AuthenticationToken): Promise<Array<any>> {
  return new Promise(function(resolve) {
    const examples: { [key: string]: Array<any> } = {
      'application/json': [
        {
          "Action": "CREATE",
          "User": {
            "name": "Alfalfa",
            "isAdmin": true
          },
          "PackageMetadata": {
            "Version": "1.2.3",
            "ID": "123567192081501",
            "Name": "Name"
          },
          "Date": "2023-03-23T23:11:15Z"
        },
        {
          "Action": "CREATE",
          "User": {
            "name": "Alfalfa",
            "isAdmin": true
          },
          "PackageMetadata": {
            "Version": "1.2.3",
            "ID": "123567192081501",
            "Name": "Name"
          },
          "Date": "2023-03-23T23:11:15Z"
        }
      ]
    };
    resolve(examples['application/json']);
  });
}

/**
 * (BASELINE)
 * Search for a package using a regular expression over package names and READMEs.
 *
 * @param body PackageQuery 
 * @param xAuthorization AuthenticationToken 
 * @returns Promise<Array<any>>
 */
export function packageByRegExGet(body: PackageQuery, xAuthorization: AuthenticationToken): Promise<Array<any>> {
  return new Promise(function(resolve) {
    const examples: { [key: string]: Array<any> } = {
      'application/json': [
        {
          "Version": "1.2.3",
          "ID": "123567192081501",
          "Name": "Name"
        },
        {
          "Version": "1.2.3",
          "ID": "123567192081501",
          "Name": "Name"
        }
      ]
    };
    resolve(examples['application/json']);
  });
}

/**
 * (BASELINE)
 * Upload or Ingest a new package.
 *
 * @param body Package 
 * @param xAuthorization AuthenticationToken 
 * @returns Promise<Package>
 */
export function packageCreate(body: Package, xAuthorization: AuthenticationToken): Promise<Package> {
  return new Promise(function(resolve) {
    const examples: { [key: string]: Package } = {
      'application/json': {
        "metadata": {
          "Version": "1.2.3",
          "ID": "123567192081501",
          "Name": "Name"
        },
        "data": {
          "Content": "Content",
          "debloat": true,
          "JSProgram": "JSProgram",
          "URL": "URL"
        }
      }
    };
    resolve(examples['application/json']);
  });
}

/**
 * (NON-BASELINE)
 * Delete a package that matches the ID.
 *
 * @param xAuthorization AuthenticationToken 
 * @param id PackageID 
 * @returns Promise<void>
 */
export function packageDelete(xAuthorization: AuthenticationToken, id: PackageID): Promise<void> {
  return new Promise(function(resolve) {
    resolve();
  });
}

/**
 * (BASELINE)
 * Get the cost of a package.
 *
 * @param id PackageID 
 * @param xAuthorization AuthenticationToken 
 * @param dependency boolean (optional)
 * @returns Promise<PackageCost>
 */
export function packageIdCostGET(id: PackageID, xAuthorization: AuthenticationToken, dependency?: boolean): Promise<PackageCost> {
  return new Promise(function(resolve) {
    const examples: { [key: string]: PackageCost } = {
      'application/json': {
        "standaloneCost": 0.8008281904610115,
        "totalCost": 6.027456183070403
      }
    };
    resolve(examples['application/json']);
  });
}

/**
 * (BASELINE)
 * Get ratings for this package.
 *
 * @param id PackageID 
 * @param xAuthorization AuthenticationToken 
 * @returns Promise<PackageRating>
 */
export function packageRate(id: PackageID, xAuthorization: AuthenticationToken): Promise<PackageRating> {
  return new Promise(function(resolve) {
    const examples: { [key: string]: PackageRating } = {
      'application/json': {
        "GoodPinningPractice": 4.145608029883936,
        "CorrectnessLatency": 5.962133916683182,
        "PullRequestLatency": 1.0246457001441578,
        "RampUpLatency": 2.3021358869347655,
        "PullRequest": 1.2315135367772556,
        "LicenseScore": 3.616076749251911,
        "BusFactorLatency": 6.027456183070403,
        "LicenseScoreLatency": 2.027123023002322,
        "GoodPinningPracticeLatency": 7.386281948385884,
        "Correctness": 1.4658129805029452,
        "ResponsiveMaintainerLatency": 9.301444243932576,
        "NetScoreLatency": 6.84685269835264,
        "NetScore": 1.4894159098541704,
        "ResponsiveMaintainer": 7.061401241503109,
        "RampUp": 5.637376656633329,
        "BusFactor": 0.8008281904610115
      }
    };
    resolve(examples['application/json']);
  });
}

/**
 * (BASELINE)
 * Return this package.
 *
 * @param xAuthorization AuthenticationToken 
 * @param id PackageID 
 * @returns Promise<Package>
 */
export function packageRetrieve(xAuthorization: AuthenticationToken, id: PackageID): Promise<Package> {
  return new Promise(function(resolve) {
    const examples: { [key: string]: Package } = {
      'application/json': {
        "metadata": {
          "Version": "1.2.3",
          "ID": "123567192081501",
          "Name": "Name"
        },
        "data": {
          "Content": "Content",
          "debloat": true,
          "JSProgram": "JSProgram",
          "URL": "URL"
        }
      }
    };
    resolve(examples['application/json']);
  });
}

/**
 * (BASELINE)
 * Update the content of the package.
 *
 * @param body Package 
 * @param id PackageID 
 * @param xAuthorization AuthenticationToken 
 * @returns Promise<void>
 */
export function packageUpdate(body: Package, id: PackageID, xAuthorization: AuthenticationToken): Promise<void> {
  return new Promise(function(resolve) {
    resolve();
  });
}

/**
 * (BASELINE)
 * Get the packages from the registry.
 *
 * @param body Array<PackageQuery> 
 * @param offset string (optional) 
 * @param xAuthorization AuthenticationToken 
 * @returns Promise<Array<PackageQuery>>
 */
export function packagesList(body: Array<PackageQuery>, offset?: string, xAuthorization?: AuthenticationToken): Promise<Array<PackageQuery>> {
  return new Promise(function(resolve) {
    const examples: { [key: string]: Array<PackageQuery> } = {
      'application/json': [
        {
          "Version": "1.2.3",
          "ID": "123567192081501",
          "Name": "Name"
        },
        {
          "Version": "1.2.3",
          "ID": "123567192081501",
          "Name": "Name"
        }
      ]
    };
    resolve(examples['application/json']);
  });
}
/*
Test input:
[
  {
    "Name": "Underscore",
    "Version": "1.2.3"
  },
  {
    "Name": "Lodash",
    "Version": "1.2.3-2.1.0"
  },
  {
    "Name": "React",
    "Version": "^1.2.3"
  }
] 
*/

/**
 * (NON-BASELINE)
 * Resets the registry.
 *
 * @param xAuthorization AuthenticationToken 
 * @returns Promise<void>
 */
export function registryReset(xAuthorization: AuthenticationToken): Promise<void> {
  return new Promise<void>((resolve) => {
    resolve();
  });
}

/**
 * (NON-BASELINE)
 * Returns an array of track objects.
 *
 * @param xAuthorization AuthenticationToken 
 * @returns Promise<Array<any>>
 */
export function tracksGET(xAuthorization: AuthenticationToken): Promise<Array<any>> {
  return new Promise<Array<any>>((resolve) => {
    const examples: { [key: string]: Array<any> } = {
      'application/json': [
        {
          "Version": "1.2.3",
          "ID": "123567192081501",
          "Name": "Name"
        },
        {
          "Version": "1.2.3",
          "ID": "123567192081501",
          "Name": "Name"
        }
      ]
    };
    resolve(examples['application/json']);
  });
}

/**
 * (NON-BASELINE)
 * Testing
 *
 * @param xAuthorization AuthenticationToken 
 * @returns Promise<Array<any>>
 */
export function testGET(xAuthorization: AuthenticationToken): Promise<Array<any>> {
  return new Promise<Array<any>>((resolve) => {
    const examples: { [key: string]: Array<any> } = {
      'application/json': [
        {
          "Version": "1.2.3",
          "ID": "testing",
          "Name": "Name"
        },
        {
          "Version": "1.2.3",
          "ID": "aaaaaaaa",
          "Name": "Name"
        }
      ]
    };
    resolve(examples['application/json']);
  });
}