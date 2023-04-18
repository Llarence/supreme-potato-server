import { useEffect, useState } from 'react'

import Head from 'next/head'
import style from '@/styles/style.module.css'

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
)

export default function Home() {
    const [blue1, blue1Set] = useState('')
    const [blue2, blue2Set] = useState('')
    const [blue3, blue3Set] = useState('')
    const [red1, red1Set] = useState('')
    const [red2, red2Set] = useState('')
    const [red3, red3Set] = useState('')
    const [elim, elimSet] = useState(false)
    const [week, weekSet] = useState('1')

    const [blueAuto, blueAutoSet] = useState(0)
    const [blueTeleop, blueTeleopSet] = useState(0)
    const [blueEndgame, blueEndgameSet] = useState(0)
    const [blueFoul, blueFoulSet] = useState(0)
    const [blueTotal, blueTotalSet] = useState(0)
    const [blueWinRate, blueWinRateSet] = useState(0)

    const [redAuto, redAutoSet] = useState(0)
    const [redTeleop, redTeleopSet] = useState(0)
    const [redEndgame, redEndgameSet] = useState(0)
    const [redFoul, redFoulSet] = useState(0)
    const [redTotal, redTotalSet] = useState(0)
    const [redWinRate, redWinRateSet] = useState(0)
    
    const [precision, precisionSet] = useState(2)
    const [getGraph, getGraphSet] = useState(false)
    const [message, messageSet] = useState('Success')

    const [selectedGraph, selectedGraphSet] = useState('auto')

    const [xGraph, xGraphSet] = useState([])
    const [redGraph, redGraphSet] = useState([])
    const [blueGraph, blueGraphSet] = useState([])

    const [distributionData, distributionDataSet] = useState({})

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        elements: {
            point:{
                radius: 0
            }
        },
        interaction: {
            intersect: false,
            mode: 'index',
        }
    }

    const data = {
        // This labels thing is dumb
        labels: xGraph,
        datasets: [
            {
                label: 'Blue',
                data: blueGraph,
                borderColor: 'rgb(53, 162, 235)',
                lineTension: 0.2
            },
            {
                label: 'Red',
                data: redGraph,
                borderColor: 'rgb(255, 99, 132)',
                lineTension: 0.2
            }
        ]
    }

    function onClick() {
        // This is dumb
        if (message == 'Working') {
            return
        }

        let detail = 0
        if (getGraph) {
            detail = 60
        }

        messageSet('Working')

        fetch('/api/match?' + 
                'blue1=' + blue1 + 
                '&blue2=' + blue2 + 
                '&blue3=' + blue3 + 
                '&red1=' + red1 + 
                '&red2=' + red2 + 
                '&red3=' + red3 + 
                '&elim=' + elim + 
                '&week=' + week +
                '&detail=' + detail).then(async response => {
            const data = await response.json();

            blueAutoSet(data['blue']['auto'])
            blueTeleopSet(data['blue']['teleop'])
            blueEndgameSet(data['blue']['endgame'])
            blueFoulSet(data['blue']['foul'])
            blueTotalSet(data['blue']['total'])
            blueWinRateSet(data['blue']['win_rate'])

            redAutoSet(data['red']['auto'])
            redTeleopSet(data['red']['teleop'])
            redEndgameSet(data['red']['endgame'])
            redFoulSet(data['red']['foul'])
            redTotalSet(data['red']['total'])
            redWinRateSet(data['red']['win_rate'])

            if(data.hasOwnProperty('distribution_data')){
                distributionDataSet(data['distribution_data'])
            } else {
                distributionDataSet({})
            }

            if (response.ok) {
                messageSet('Success')
            } else {
                messageSet('Failure')
            }
        }).catch((_) => {
           messageSet('Failure')
        })
    }

    useEffect(() => {
        let name = selectedGraph + '_distribution'
        if (distributionData.hasOwnProperty(name)) {
            let currDistributionData = distributionData[name]

            let newXGraph = []
            let newBlueGraph = []
            let newRedGraph = []
            for(let i = 0; i < currDistributionData.length; i++) {
                let points = currDistributionData[i];

                newXGraph.push(parseFloat(points[0]).toFixed(precision))
                newBlueGraph.push([points[0], points[1]])
                newRedGraph.push([points[0], points[2]])
            }

            xGraphSet(newXGraph)
            blueGraphSet(newBlueGraph)
            redGraphSet(newRedGraph)
        } else {
            xGraphSet([])
            blueGraphSet([])
            redGraphSet([])
        }
    }, [selectedGraph, distributionData, precision])

    return (
        <>
            <Head>
                <title>Supreme Potato</title>
                <link rel='icon' href='/favicon.ico'/>
            </Head>
            <main>
                <div className={style.table}>
                    <div className={style.cell}>
                        <p>Blue:</p>
                        <input className={style.thin} type='text' value={blue1} onChange={e => blue1Set(e.target.value)}/>
                        <input className={style.thin} type='text' value={blue2} onChange={e => blue2Set(e.target.value)}/>
                        <input className={style.thin} type='text' value={blue3} onChange={e => blue3Set(e.target.value)}/>
                    </div>
                    <div className={style.cell}>
                        <p>Red:</p>
                        <input className={style.thin} type='text' value={red1} onChange={e => red1Set(e.target.value)}/>
                        <input className={style.thin} type='text' value={red2} onChange={e => red2Set(e.target.value)}/>
                        <input className={style.thin} type='text' value={red3} onChange={e => red3Set(e.target.value)}/>
                    </div>
                    <div className={style.cell}>
                        <p>Elimination:</p>
                        {/* elimSet(!elim) is sus */}
                        <input type='checkbox' checked={elim} onChange={_ => elimSet(!elim)}/>
                    </div>
                    <div className={style.cell}>
                        <p>Week:</p>
                        <input className={style.thin} type='number' value={week} onChange={e => weekSet(e.target.value)}/>
                    </div>
                    <div className={style.cell}>
                        <div className={style.table}>
                            <div className={style.cell}>
                                <p>Precision</p>
                                <input type='range' min='0' max='6' value={precision} onChange={e => precisionSet(parseInt(e.target.value))}/>
                            </div>
                            <div className={style.cell}>
                                {/* getGraphSet(!getGraph) is sus */}
                                <p>Get Graph:</p>
                                <input type='checkbox' checked={getGraph} onChange={_ => getGraphSet(!getGraph)}/>
                            </div>
                            <div className={style.cell}>
                                <button onClick={onClick}>Update</button>
                                <p>{message}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className={style.table}>
                    <div className={style.cell}>
                        <p>Blue:</p>
                        <p>{'Auto:' + blueAuto.toFixed(precision)}</p>
                        <p>{'Teleop:\n' + blueTeleop.toFixed(precision)}</p>
                        <p>{'Engame:\n' + blueEndgame.toFixed(precision)}</p>
                        <p>{'Foul:\n' + blueFoul.toFixed(precision)}</p>
                        <p>{'Total:\n' + blueTotal.toFixed(precision)}</p>
                        <p>{'Win Rate:\n' + blueWinRate.toFixed(precision) + '%'}</p>
                    </div>
                    <div className={style.cell}>
                        <p>Red:</p>
                        <p>{'Auto:\n' + redAuto.toFixed(precision)}</p>
                        <p>{'Teleop:\n' + redTeleop.toFixed(precision)}</p>
                        <p>{'Engame:\n' + redEndgame.toFixed(precision)}</p>
                        <p>{'Foul:\n' + redFoul.toFixed(precision)}</p>
                        <p>{'Total:\n' + redTotal.toFixed(precision)}</p>
                        <p>{'Win Rate:\n' + redWinRate.toFixed(precision) + '%'}</p>
                    </div>
                    <div className={style.cell}>
                        <select value={selectedGraph} onChange={e => { selectedGraphSet(e.target.value) } }>
                            <option value="auto">Auto</option>
                            <option value="teleop">Teleop</option>
                            <option value="endgame">Endgame</option>
                            <option value="foul">Foul</option>
                            <option value="total">Total</option>
                        </select>
                        <div className={style.tall}>
                            <Line options={options} data={data}/>
                        </div>
                    </div>
                </div>
            </main>
        </>
    )
}
