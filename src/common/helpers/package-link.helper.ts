/** Mirrors Express `helpers/RouteMaker.js` */
export function generatePackageLink(path: string, packageId: number | string, _email?: string) {
  return `${process.env.FRONTEND_URL || ''}${path}${packageId}`;
}
