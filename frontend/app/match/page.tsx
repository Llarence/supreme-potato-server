'use client'

import { useState } from 'react'

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    Legend
  )

import CreatableSelect from 'react-select/creatable'

import NormalDistribution from 'normal-distribution'

// TODO: Some distributions still will not graph properly
//  (Blue: 7500, Red: 2521, 2910, 111, year: 2019, week: 3, type: foul)
// TODO: Make sure the win bounds and sample points give good numbers

const graphPoints = 250
const winSamplePoints = 5e4

// Sets the y value of the bound points relative to the max high of the distribution
const graphBoundsYFactor = 0.025
const winBoundsYFactor = 1e-6

interface SelectOption {
    readonly label: string
    readonly value: string
}

// All these functions are necesary for numerical accuracy

function polyDiv(xSqrd: number, x: number, a: number, b: number, c: number, d: number): number {
    const e = xSqrd + (a * x) + b
    const f = xSqrd + (c * x) + d
    return e / f
}

function normalERFC0(x: number) {
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

function erfc(x: number, mean: number, standardDeviation: number) {
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

function getWin(distribution1: NormalDistribution, distribution2: NormalDistribution): number {
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

function calcDisBounds(distribution: NormalDistribution, boundsYFactor: number): {low: number, high: number} {
    // The erfc0 gets cancelled out so this isn't the height of the truncated normal
    const maxHeight = distribution.pdf(Math.max(0, distribution.mean))
    const a = boundsYFactor * maxHeight * distribution.standardDeviation * Math.sqrt(2 * Math.PI)
    const b = distribution.standardDeviation * Math.sqrt(-2 * Math.log(a))
    return {low: Math.max(distribution.mean - b, 0), high: distribution.mean + b}
}

export default function Page() {
    const [blueSelectInputValue, setBlueSelectInputValue] = useState('')
    const [blueSelectValue, setBlueSelectValue] = useState<readonly SelectOption[]>([])

    const [redSelectInputValue, setRedSelectInputValue] = useState('')
    const [redSelectValue, setRedSelectValue] = useState<readonly SelectOption[]>([])

    const [response, setResponse] = useState<any>(undefined)

    const [year, setYear] = useState('')
    const [elim, setElim] = useState(false)
    const [week, setWeek] = useState('')

    const [dataType, setDataType] = useState('total')
    const [buttonDisabled, setButtonDisabled] = useState(false)

    const [blueDistribution, setBlueDistribution] = useState<NormalDistribution>(new NormalDistribution())
    const [redDistribution, setRedDistribution] = useState<NormalDistribution>(new NormalDistribution())

    const [xs, setXs] = useState<string[]>([])
    const [blueYs, setBlueYs] = useState<Number[]>([])
    const [redYs, setRedYs] = useState<Number[]>([])

    const [winRate, setWinRate] = useState(NaN)

    function handleKey(key: string,
                       inputValue: string,
                       selectValue: readonly SelectOption[],
                       setInputValue: React.Dispatch<React.SetStateAction<string>>,
                       setSelectValue: React.Dispatch<React.SetStateAction<readonly SelectOption[]>>): Boolean {
        if (!inputValue || !/^[1-9]\d*$/.test(inputValue)) {
            return false
        }

        
        for (let i = 0; i < selectValue.length; i++) {
            if (selectValue[i].label == inputValue) {
                return false
            }
        }

        if (key == 'Enter' || key == 'Tab') {
            setSelectValue([...selectValue, { label: inputValue, value: inputValue }])
            setInputValue('')
            return true
        }

        return false
    }

    function updateDistributions(blueDistribution: NormalDistribution, redDistribution: NormalDistribution) {
        const blueBounds = calcDisBounds(blueDistribution, graphBoundsYFactor)
        const redBounds = calcDisBounds(redDistribution, graphBoundsYFactor)

        const minX = Math.min(blueBounds.low, redBounds.low)
        const maxX = Math.max(blueBounds.high, redBounds.high)

        const deltaX = (maxX - minX) / (graphPoints - 1)

        const blueScale = 2.0 / erfc0(blueDistribution.mean, blueDistribution.standardDeviation)
        const redScale = 2.0 / erfc0(redDistribution.mean, redDistribution.standardDeviation)

        let xs: string[] = []
        let blueYs: Number[] = []
        let redYs: Number[] = []
        for (let i = 0; i < graphPoints; i++) {
            const x = minX + (i * deltaX)

            xs.push(x.toFixed(2))
            if (x >= 0) {
                blueYs.push(blueDistribution.pdf(x) * blueScale)
                redYs.push(redDistribution.pdf(x) * redScale)
            } else {
                blueYs.push(0)
                redYs.push(0)
            }
        }

        setXs(xs)
        setBlueYs(blueYs)
        setRedYs(redYs)

        setWinRate(getWin(blueDistribution, redDistribution))
        setBlueDistribution(blueDistribution)
        setRedDistribution(redDistribution)
    }

    async function updateChart() {
        setButtonDisabled(true)

        let teamRequest = ''
        blueSelectValue.forEach(element => { teamRequest += '&blues=frc' + element.value })
        redSelectValue.forEach(element => { teamRequest += '&reds=frc' + element.value})

        const rawResponse = await fetch(`/api/match?year=${year}&elim=${elim}&week=${week}${teamRequest}`)
        if (!rawResponse.ok) {
            setButtonDisabled(false)
            return
        }
        
        const response = await rawResponse.json()
        
        const blue = response['blue']['total']
        const red = response['red']['total']

        updateDistributions(new NormalDistribution(blue['mean'], blue['stddev']), new NormalDistribution(red['mean'], red['stddev']))

        setDataType('total')
        setResponse(response)
        setButtonDisabled(false)
    }

    return (
        <>
            <CreatableSelect
                components={{ DropdownIndicator: null }}
                inputValue={blueSelectInputValue}
                isClearable
                isMulti
                menuIsOpen={false}
                onChange={setBlueSelectValue}
                onInputChange={setBlueSelectInputValue}
                onKeyDown={event => {
                        if (handleKey(event.key, blueSelectInputValue, blueSelectValue,
                                      setBlueSelectInputValue, setBlueSelectValue)) {
                            event.preventDefault()
                        }
                    }
                }
                onMenuClose={() => handleKey('Enter', blueSelectInputValue, blueSelectValue,
                                             setBlueSelectInputValue, setBlueSelectValue)}
                placeholder='Blue Teams...'
                value={blueSelectValue}
            />
            <CreatableSelect
                components={{ DropdownIndicator: null }}
                inputValue={redSelectInputValue}
                isClearable
                isMulti
                menuIsOpen={false}
                onChange={newValue => setRedSelectValue(newValue)}
                onInputChange={newValue => setRedSelectInputValue(newValue)}
                onKeyDown={event => {
                        if (handleKey(event.key, redSelectInputValue, redSelectValue,
                                      setRedSelectInputValue, setRedSelectValue)) {
                            event.preventDefault()
                        }
                    }
                }
                onMenuClose={() => handleKey('Enter', redSelectInputValue, redSelectValue,
                                             setRedSelectInputValue, setRedSelectValue)}
                placeholder='Red Teams...'
                value={redSelectValue}
            />
            <input type='number' value={year} onChange={event => setYear(event.target.value)} />
            <input type='checkbox' checked={elim} onChange={() => setElim(!elim)} />
            <input type='number' value={week} onChange={event => setWeek(event?.target.value)} />
            <p>{`Chance blue has a higher ${dataType}: ${(winRate * 100).toFixed(2)}%`}</p>
            <button onClick={updateChart} disabled={buttonDisabled}>Go</button>
            <select disabled={response == undefined} value={dataType} onChange={event => {
                        const value = event.target.value
                        const blue = response['blue'][value]
                        const red = response['red'][value]
                
                        updateDistributions(new NormalDistribution(blue['mean'], blue['stddev']), new NormalDistribution(red['mean'], red['stddev']))
                
                        setDataType(value) 
                    }
                }>
                <option value='total'>Total</option>
                <option value='auto'>Auto</option>
                <option value='teleop'>Teleop</option>
                <option value='foul'>Foul</option>
            </select>
            <Line
                options={{
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.dataset.label
                                    const x = Number(context.label)
                                    
                                    let val = 1
                                    if (x >= 0) {
                                        if (label == 'Blue') {
                                            val = erfc(x, blueDistribution.mean, blueDistribution.standardDeviation) / 
                                                erfc0(blueDistribution.mean, blueDistribution.standardDeviation)
                                        } else if (label == 'Red') {
                                            val = erfc(x, redDistribution.mean, redDistribution.standardDeviation) / 
                                                erfc0(redDistribution.mean, redDistribution.standardDeviation)
                                        }
                                    }
                                    
                                    return `${label}: ${(val * 100).toFixed(2)}%`
                                }
                            }
                        }
                    },
                    elements: {
                        point:{
                            radius: 0
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'nearest',
                    }
                }}
                data={{
                    labels: xs,
                    datasets: [{
                        fill: true,
                        label: 'Blue',
                        data: blueYs,
                        borderColor: 'rgb(53, 56, 235)',
                        backgroundColor: 'rgba(53, 56, 235, 0.5)'
                    },
                    {
                        fill: true,
                        label: 'Red',
                        data: redYs,
                        borderColor: 'rgb(235, 69, 54)',
                        backgroundColor: 'rgba(235, 69, 54, 0.5)'
                    }]
                }}
            />
        </>
    )
}
