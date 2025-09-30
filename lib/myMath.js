export const lerp = (x, y, a) => x * (1 - a) + y * a;
 export const clamp = (a, min = 0, max = 1) => Math.min(max, Math.max(min, a));
 export const invlerp = (x, y, a) => clamp((a - x) / (y - x));
 export const range = (x1, y1, x2, y2, a) => lerp(x2, y2, invlerp(x1, y1, a));

 export function Vector2Distance(y1, y2, x1, x2) {
    let a = x1 - x2;
    let b = y1 - y2;
    return Math.sqrt(a * a + b * b);
  }

  export function quickHull (points){
    function getDistant(cpt, bl) {
        const Vy = bl[1][0] - bl[0][0];
        const Vx = bl[0][1] - bl[1][1];
        return (Vx * (cpt[0] - bl[0][0]) + Vy * (cpt[1] - bl[0][1]))
    }
    function findMostDistantPointFromBaseLine(baseLine, points) {
        let maxD = 0;
        const maxPt = new Array();
        const newPoints = new Array();
        for (const idx in points) {
            const pt = points[idx];
            var d = getDistant(pt, baseLine);
            if (d > 0) {
                newPoints.push(pt);
            } else {
                continue;
            }
            if (d > maxD) {
                maxD = d;
                maxPt = pt;
            }
        }
        return { 'maxPoint': maxPt, 'newPoints': newPoints }
    }
    const allBaseLines = new Array();
    function buildConvexHull(baseLine, points) {
        allBaseLines.push(baseLine)
        const convexHullBaseLines = new Array();
        const t = findMostDistantPointFromBaseLine(baseLine, points);
        if (t.maxPoint.length) { // if there is still a point "outside" the base line
            convexHullBaseLines =
                convexHullBaseLines.concat(
                    buildConvexHull([baseLine[0], t.maxPoint], t.newPoints)
                );
            convexHullBaseLines =
                convexHullBaseLines.concat(
                    buildConvexHull([t.maxPoint, baseLine[1]], t.newPoints)
                );
            return convexHullBaseLines;
        } else {  // if there is no more point "outside" the base line, the current base line is part of the convex hull
            return [baseLine];
        }
    }

    let maxX, minX;
    let maxPt, minPt;
    for (const pointId in points) {
        let point = points[pointId];
        if (point[0] > maxX || !maxX) {
            maxPt = point;
            maxX = point[0];
        }
        if (point[0] < minX || !minX) {
            minPt = point;
            minX = point[0];
        }
    }
    const convexHull = [].concat(buildConvexHull([minPt, maxPt], points),
        buildConvexHull([maxPt, minPt], points))
    return(convexHull)
}