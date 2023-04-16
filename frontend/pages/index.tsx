import { useState } from 'react';

import Head from 'next/head'
import style from '@/styles/style.module.css'

import LineGraph from 'smooth-line-graph';

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

    const [redGraph, redGraphSet] = useState([])
    const [blueGraph, blueGraphSet] = useState([])

    const props = {
        name: 'simple',
        width: 300,
        height: 300,
        lines: [
            {
                key: 'red',
                data: redGraph,
                color: 'red',
                smooth: true
            },
            {
                key: 'blue',
                data: blueGraph,
                color: 'blue',
                smooth: true
            }
        ]
    };

    const onClick = () => {
        fetch('/api/match?' + 
                'blue1=' + blue1 + 
                '&blue2=' + blue2 + 
                '&blue3=' + blue3 + 
                '&red1=' + red1 + 
                '&red2=' + red2 + 
                '&red3=' + red3 + 
                '&elim=' + elim + 
                '&week=' + week +
                '&detail=' + getGraph).then(async response => {
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

            

            if (response.ok) {
                messageSet('Success')
            } else {
                messageSet('Failure')
            }
        })//.catch((_) => {
        //   messageSet('Failure')
        //})
    }

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
                        <input type='text' value={blue1} onChange={e => blue1Set(e.target.value)}/>
                        <input type='text' value={blue2} onChange={e => blue2Set(e.target.value)}/>
                        <input type='text' value={blue3} onChange={e => blue3Set(e.target.value)}/>
                    </div>
                    <div className={style.cell}>
                        <p>Red:</p>
                        <input type='text' value={red1} onChange={e => red1Set(e.target.value)}/>
                        <input type='text' value={red2} onChange={e => red2Set(e.target.value)}/>
                        <input type='text' value={red3} onChange={e => red3Set(e.target.value)}/>
                    </div>
                    <div className={style.cell}>
                        <p>Elimination:</p>
                        {/* elimSet(!elim) is sus */}
                        <input type='checkbox' checked={elim} onChange={_ => elimSet(!elim)}/>
                    </div>
                    <div className={style.cell}>
                        <p>Week:</p>
                        <input type='number' value={week} onChange={e => weekSet(e.target.value)}/>
                    </div>
                    <div className={style.cell}>
                        <button onClick={onClick}>Update</button>
                        {/* getGraphSet(!getGraph) is sus */}
                        <input type='checkbox' checked={getGraph} onChange={_ => getGraphSet(!getGraph)}/>
                        <input type='range' min='0' max='6' value={precision} onChange={e => precisionSet(parseInt(e.target.value))}/>
                        <p>{message}</p>
                    </div>
                </div>
                <div className={style.table}>
                    <div className={style.cell}>
                        <p>Blue:</p>
                        <p>{'Auto: ' + blueAuto.toFixed(precision)}</p>
                        <p>{'Teleop: ' + blueTeleop.toFixed(precision)}</p>
                        <p>{'Engame: ' + blueEndgame.toFixed(precision)}</p>
                        <p>{'Foul: ' + blueFoul.toFixed(precision)}</p>
                        <p>{'Total: ' + blueTotal.toFixed(precision)}</p>
                        <p>{'Win Rate: ' + blueWinRate.toFixed(precision) + '%'}</p>
                    </div>
                    <div className={style.cell}>
                        <p>Red:</p>
                        <p>{'Auto: ' + redAuto.toFixed(precision)}</p>
                        <p>{'Teleop: ' + redTeleop.toFixed(precision)}</p>
                        <p>{'Engame: ' + redEndgame.toFixed(precision)}</p>
                        <p>{'Foul: ' + redFoul.toFixed(precision)}</p>
                        <p>{'Total: ' + redTotal.toFixed(precision)}</p>
                        <p>{'Win Rate: ' + redWinRate.toFixed(precision) + '%'}</p>
                    </div>
                    <LineGraph className={style.cell} {...props}/>
                </div>
            </main>
        </>
    )
}
