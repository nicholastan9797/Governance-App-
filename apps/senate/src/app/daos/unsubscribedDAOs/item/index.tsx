'use client'

import { useEffect, useState } from 'react'
import { FastAverageColor } from 'fast-average-color'
import { trpc } from '../../../../helpers/trpcClient'
import Image from 'next/image'

export const UnsubscribedDAO = (props: {
    daoId: string
    daoName: string
    daoPicture: string
    daoHandlers: string[]
}) => {
    // const subscribe = trpc.user.subscriptions.subscribe.useMutation()

    const [showMenu, setShowMenu] = useState(false)

    const [backgroundColor, setBackgroundColor] = useState('#4e4e4e')

    useEffect(() => {
        const fetch = async (url: string) => {
            const fac = new FastAverageColor()
            fac.getColorAsync(url + '.svg')
                // eslint-disable-next-line promise/always-return
                .then((color) => {
                    setBackgroundColor(`${color.hex}50`)
                })
                .catch((e) => {
                    console.log(e)
                })
        }
        fetch(props.daoPicture)
    }, [props.daoPicture])

    const [getDailyEmails, setDailyEmails] = useState(true)

    return (
        <div className='h-[320px] w-[240px]'>
            {showMenu ? (
                <div
                    className='flex h-full w-full flex-col items-center justify-between rounded bg-black text-sm font-bold text-white shadow'
                    data-testid='daocard-unfollowed-back'
                >
                    <div className='flex h-full w-full flex-col items-center justify-between'>
                        <div className='flex flex-col items-center gap-6 pt-5'>
                            <div className='flex w-full flex-row justify-between'>
                                <p>Notifications</p>
                                <div
                                    className='cursor-pointer'
                                    onClick={() => {
                                        setShowMenu(false)
                                    }}
                                    data-testid='close-menu'
                                >
                                    <Image
                                        width='32'
                                        height='32'
                                        src='/assets/Icon/Close.svg'
                                        alt='close button'
                                    />
                                </div>
                            </div>
                            <div className='flex w-full flex-row items-center justify-between gap-2'>
                                <p>Get daily emails</p>
                                <label className='relative inline-flex cursor-pointer items-center bg-gray-400'>
                                    <input
                                        type='checkbox'
                                        checked={getDailyEmails}
                                        onChange={(e) =>
                                            setDailyEmails(e.target.checked)
                                        }
                                        className='peer sr-only'
                                    />
                                    <div className="peer h-6 w-11 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5  after:bg-black after:transition-all after:content-[''] peer-checked:bg-green-400 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gray-700" />
                                </label>
                            </div>
                            {/* <p>Get daily emails about:</p>
                    <div className="flex w-full flex-row items-center justify-between gap-2">
                        <p>New Proposals</p>
                        <label className="relative inline-flex cursor-pointer items-center bg-gray-700">
                            <input
                                type="checkbox"
                                checked={true}
                                className="peer sr-only"
                            />
                            <div className="peer h-6 w-11 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5  after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-gray-500 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                        </label>
                    </div>
                    <div className="flex w-full flex-row items-center justify-between gap-2">
                        <p>Proposal ending soon</p>
                        <label className="relative inline-flex cursor-pointer items-center bg-gray-700">
                            <input
                                type="checkbox"
                                checked={true}
                                className="peer sr-only"
                            />
                            <div className="peer h-6 w-11 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5  after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-gray-500 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                        </label>
                    </div> */}
                        </div>

                        <button
                            className='h-20 w-full bg-white text-xl font-bold text-black'
                            onClick={() => {
                                // subscribe.mutate(
                                //     {
                                //         daoId: props.daoId
                                //     },
                                //     {
                                //         onSuccess() {
                                //             setShowMenu(false)
                                //         }
                                //     }
                                // )
                            }}
                            data-testid='subscribe'
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            ) : (
                <div
                    style={{ backgroundColor: backgroundColor }}
                    className='relative flex h-full w-full flex-col rounded text-sm font-bold text-white shadow'
                    data-testid='daocard-unfollowed-front'
                >
                    <div className='flex h-full flex-col items-center justify-end px-6 pb-6'>
                        <Image
                            width='96'
                            height='96'
                            src={props.daoPicture + '.svg'}
                            alt='dao logo'
                            data-testid='dao-picture'
                        />

                        <div
                            className='pt-6 text-center text-[36px] font-thin leading-8'
                            data-testid='dao-name'
                        >
                            {props.daoName}
                        </div>

                        <div
                            className='flex flex-row gap-4 pt-6 opacity-50'
                            data-testid='dao-handlers'
                        >
                            {props.daoHandlers.map((handler, index: number) => {
                                switch (handler) {
                                    case 'SNAPSHOT':
                                        return (
                                            <Image
                                                key={index}
                                                width='24'
                                                height='24'
                                                src='/assets/Chain/Snapshot/On_Dark.svg'
                                                alt='snapshot proposals'
                                                data-testid='dao-handler-snapshot'
                                            />
                                        )
                                    case 'AAVE_CHAIN':
                                    case 'COMPOUND_CHAIN':
                                    case 'UNISWAP_CHAIN':
                                    case 'MAKER_POLL':
                                    case 'MAKER_EXECUTIVE':
                                        return (
                                            <Image
                                                key={index}
                                                width='24'
                                                height='24'
                                                src='/assets/Chain/Ethereum/On_Dark.svg'
                                                alt='chain proposals'
                                                data-testid='dao-handler-chain'
                                            />
                                        )
                                }
                            })}
                        </div>
                    </div>
                    <button
                        className='h-[56px] w-full bg-white text-xl font-bold text-black'
                        onClick={() => {
                            setShowMenu(true)
                        }}
                        data-testid='open-menu'
                    >
                        Subscribe
                    </button>
                </div>
            )}
        </div>
    )
}
