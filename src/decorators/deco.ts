

// export function Get(path: string) {
//     return function (target: any, key: string, descriptor: PropertyDescriptor)  {
//         if(!target.__routes) target.__routes: Array<SubRouteData> = []
//         target.__routes.push( {
//             method: "GET", 
//             path, 
//             handlerName: key, 
//             controller: target.constructor
//         }) 
//     }
// }

// export function Post(path: string) {
//     return function (target: any, key: string, descriptor: PropertyDescriptor)  {
//         if(!target.__routes) target.__routes = []
//         target.__routes.push( {
//             method: "POST", 
//             path, 
//             handlerName: key, 
//             controller: target.constructor
//         }) 
//     }
// }