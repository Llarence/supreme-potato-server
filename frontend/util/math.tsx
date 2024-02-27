import NormalDistribution from 'normal-distribution'

const winSamplePoints = 5e4
const winBoundsYFactor = 1e-6

function polyDiv(xSqrd: number, x: number, a: number, b: number, c: number, d: number): number {
    const e = xSqrd + (a * x) + b
    const f = xSqrd + (c * x) + d
    return e / f
}

export function normalERFC0(x: number) {
    const xSqrd = x * x

    const a = (0.56418958354775629 / (x + 2.06955023132914151))
    const b = polyDiv(xSqrd, x, 2.71078540045147805, 5.80755613130301624, 3.47954057099518960, 12.06166887286239555)
    const c = polyDiv(xSqrd, x, 3.47469513777439592, 12.07402036406381411, 3.72068443960225092, 8.44319781003968454)
    const d = polyDiv(xSqrd, x, 4.00561509202259545, 9.30596659485887898, 3.90225704029924078, 6.36161630953880464)
    const e = polyDiv(xSqrd, x, 5.16722705817812584, 9.12661617673673262, 4.03296893109262491, 5.13578530585681539)
    const f = polyDiv(xSqrd, x, 5.95908795446633271, 9.19435612886969243, 4.11240942957450885, 4.48640329523408675)
    const g = Math.exp(-xSqrd)

    return a * b * c * d * e * f * g
}

function erfc0(mean: number, standardDeviation: number) {
    const x = -mean / standardDeviation / Math.SQRT2
    
    if (x < 0) {
        return 2 - normalERFC0(-x)
    } else {
        return normalERFC0(x)
    }
}

export function erfc(x: number, mean: number, standardDeviation: number) {
    return erfc0(mean - x, standardDeviation)
}

function sampleBounds(distribution1: NormalDistribution, distribution2: NormalDistribution, low: number, high: number, samples: number): number {
    let res = 0

    const deltaX = (high - low) / (samples - 1)
    for (let i = 0; i < samples; i++) {
        const x = low + (deltaX * i)
        const cdf1 = erfc(x, distribution1.mean, distribution1.standardDeviation) / 
            erfc0(distribution1.mean, distribution1.standardDeviation)
        const pdf2 = distribution2.pdf(x) * 2.0 / erfc0(distribution2.mean, distribution2.standardDeviation)
        
        res += cdf1 * pdf2 * deltaX
    }
    
    return res
}

export function getWin(distribution1: NormalDistribution, distribution2: NormalDistribution): number {
    const bounds1 = calcDisBounds(distribution1, winBoundsYFactor)
    const bounds2 = calcDisBounds(distribution2, winBoundsYFactor)

    if (bounds1.low > bounds2.high || bounds2.low > bounds1.high) {
        return sampleBounds(distribution1, distribution2, bounds1.low, bounds1.high, winSamplePoints) +
            sampleBounds(distribution1, distribution2, bounds2.low, bounds2.high, winSamplePoints)
    } else {
        const low = Math.min(bounds1.low, bounds2.low);
        const high = Math.min(bounds1.high, bounds2.high);

        return sampleBounds(distribution1, distribution2, low, high, winSamplePoints * 2)
    }
}

export function calcDisBounds(distribution: NormalDistribution, boundsYFactor: number): {low: number, high: number} {
    // The erfc0 gets cancelled out so this isn't the height of the truncated normal
    const maxHeight = distribution.pdf(Math.max(0, distribution.mean))
    const a = boundsYFactor * maxHeight * distribution.standardDeviation * Math.sqrt(2 * Math.PI)
    const b = distribution.standardDeviation * Math.sqrt(-2 * Math.log(a))
    return {low: Math.max(distribution.mean - b, 0), high: distribution.mean + b}
}
