/* eslint-disable @typescript-eslint/no-unused-vars */
import { prisma } from './index'
import { DAOHandlerType } from '@prisma/client'
import { ethers } from 'ethers'

const seedData = async () => {
    console.log('Inserting daos')

    await prisma.dao.upsert({
        where: { name: 'Aave' },
        update: {},
        create: {
            name: 'Aave',
            picture: '/assets/Project_Icons/aave',
            handlers: {
                create: [
                    {
                        type: DAOHandlerType.AAVE_CHAIN,
                        chainindex: 11427399,
                        decoder: {
                            address:
                                '0xEC568fffba86c094cf06b22134B23074DFE2252c',
                            proposalUrl:
                                'https://app.aave.com/governance/proposal/?proposalId='
                        }
                    },
                    {
                        type: DAOHandlerType.SNAPSHOT,
                        decoder: {
                            space: 'aave.eth'
                        }
                    }
                ]
            }
        }
    })

    await prisma.dao.upsert({
        where: { name: 'MakerDAO' },
        update: {},
        create: {
            name: 'MakerDAO',
            picture: '/assets/Project_Icons/makerdao',
            handlers: {
                create: [
                    {
                        type: DAOHandlerType.MAKER_EXECUTIVE,
                        chainindex: 8000000,
                        decoder: {
                            address:
                                '0x0a3f6849f78076aefaDf113F5BED87720274dDC0',
                            proposalUrl: 'https://vote.makerdao.com/executive/'
                        }
                    },
                    {
                        type: DAOHandlerType.MAKER_POLL,
                        chainindex: 8000000,
                        decoder: {
                            address_create:
                                '0xf9be8f0945acddeedaa64dfca5fe9629d0cf8e5d',
                            address_vote:
                                '0xD3A9FE267852281a1e6307a1C37CDfD76d39b133',
                            proposalUrl: 'https://vote.makerdao.com/polling/'
                        }
                    },
                    {
                        type: DAOHandlerType.MAKER_POLL_ARBITRUM,
                        chainindex: 24755862,
                        decoder: {
                            address_vote:
                                '0x4f4e551b4920a5417F8d4e7f8f099660dAdadcEC'
                        }
                    }
                ]
            }
        }
    })

    await prisma.dao.upsert({
        where: { name: 'Balancer' },
        update: {},
        create: {
            name: 'Balancer',
            picture: '/assets/Project_Icons/balancer',
            handlers: {
                create: [
                    {
                        type: DAOHandlerType.SNAPSHOT,
                        decoder: {
                            space: 'balancer.eth'
                        }
                    }
                ]
            }
        }
    })

    await prisma.dao.upsert({
        where: { name: 'Optimism' },
        update: {},
        create: {
            name: 'Optimism',
            picture: '/assets/Project_Icons/optimism',
            handlers: {
                create: [
                    {
                        type: DAOHandlerType.SNAPSHOT,
                        decoder: {
                            space: 'opcollective.eth'
                        }
                    }
                ]
            }
        }
    })

    await prisma.dao.upsert({
        where: { name: 'Element' },
        update: {},
        create: {
            name: 'Element',
            picture: '/assets/Project_Icons/element-dao',
            handlers: {
                create: [
                    {
                        type: DAOHandlerType.SNAPSHOT,
                        decoder: {
                            space: 'elfi.eth'
                        }
                    }
                ]
            }
        }
    })

    await prisma.dao.upsert({
        where: { name: '1inch' },
        update: {},
        create: {
            name: '1inch',
            picture: '/assets/Project_Icons/1inch',
            handlers: {
                create: [
                    {
                        type: DAOHandlerType.SNAPSHOT,
                        decoder: {
                            space: '1inch.eth'
                        }
                    }
                ]
            }
        }
    })

    await prisma.dao.upsert({
        where: { name: 'Hop Protocol' },
        update: {},
        create: {
            name: 'Hop Protocol',
            picture: '/assets/Project_Icons/hop-protocol',
            handlers: {
                create: [
                    {
                        type: DAOHandlerType.SNAPSHOT,
                        decoder: {
                            space: 'hop.eth'
                        }
                    },
                    {
                        type: DAOHandlerType.HOP_CHAIN,
                        chainindex: 14923682,
                        decoder: {
                            address:
                                '0xed8Bdb5895B8B7f9Fdb3C087628FD8410E853D48',
                            proposalUrl:
                                'https://www.tally.xyz/gov/hop/proposal/'
                        }
                    }
                ]
            }
        }
    })

    await prisma.dao.upsert({
        where: { name: 'SafeDAO' },
        update: {},
        create: {
            name: 'SafeDAO',
            picture: '/assets/Project_Icons/safedao',
            handlers: {
                create: [
                    {
                        type: DAOHandlerType.SNAPSHOT,
                        decoder: {
                            space: 'safe.eth'
                        }
                    }
                ]
            }
        }
    })

    await prisma.dao.upsert({
        where: { name: 'Compound' },
        update: {},
        create: {
            name: 'Compound',
            picture: '/assets/Project_Icons/compound',
            handlers: {
                create: [
                    {
                        type: DAOHandlerType.COMPOUND_CHAIN,
                        chainindex: 12006100,
                        decoder: {
                            address:
                                '0xc0Da02939E1441F497fd74F78cE7Decb17B66529',
                            proxyAddress:
                                '0xeF3B6E9e13706A8F01fe98fdCf66335dc5CfdEED',
                            proposalUrl:
                                'https://compound.finance/governance/proposals/'
                        }
                    },
                    {
                        type: DAOHandlerType.SNAPSHOT,
                        decoder: {
                            space: 'comp-vote.eth'
                        }
                    }
                ]
            }
        }
    })

    await prisma.dao.upsert({
        where: { name: 'Synthetix' },
        update: {},
        create: {
            name: 'Synthetix',
            picture: '/assets/Project_Icons/synthetix',
            handlers: {
                create: [
                    {
                        type: DAOHandlerType.SNAPSHOT,
                        decoder: {
                            space: 'snxgov.eth'
                        }
                    }
                ]
            }
        }
    })

    await prisma.dao.upsert({
        where: { name: 'dYdX' },
        update: {},
        create: {
            name: 'dYdX',
            picture: '/assets/Project_Icons/dYdX',
            handlers: {
                create: [
                    {
                        type: DAOHandlerType.SNAPSHOT,
                        decoder: {
                            space: 'dydxgov.eth'
                        }
                    },
                    {
                        type: DAOHandlerType.DYDX_CHAIN,
                        chainindex: 12816311,
                        decoder: {
                            address:
                                '0x7E9B1672616FF6D6629Ef2879419aaE79A9018D2',
                            proposalUrl:
                                'https://dydx.community/dashboard/proposal/'
                        }
                    }
                ]
            }
        }
    })

    await prisma.dao.upsert({
        where: { name: 'Uniswap' },
        update: {},
        create: {
            name: 'Uniswap',
            picture: '/assets/Project_Icons/uniswap',
            handlers: {
                create: [
                    {
                        type: DAOHandlerType.UNISWAP_CHAIN,
                        chainindex: 13059158,
                        decoder: {
                            address:
                                '0x408ED6354d4973f66138C91495F2f2FCbd8724C3',
                            proxyAddress:
                                '0x53a328f4086d7c0f1fa19e594c9b842125263026',
                            proposalUrl: 'https://app.uniswap.org/#/vote/2/'
                        }
                    },
                    {
                        type: DAOHandlerType.SNAPSHOT,
                        decoder: {
                            space: 'uniswap'
                        }
                    }
                ]
            }
        }
    })

    await prisma.dao.upsert({
        where: { name: 'ENS' },
        update: {},
        create: {
            name: 'ENS',
            picture: '/assets/Project_Icons/ens',
            handlers: {
                create: [
                    {
                        type: DAOHandlerType.ENS_CHAIN,
                        chainindex: 13533773,
                        decoder: {
                            address:
                                '0x323A76393544d5ecca80cd6ef2A560C6a395b7E3',
                            proposalUrl:
                                'https://www.tally.xyz/gov/ens/proposal/'
                        }
                    },
                    {
                        type: DAOHandlerType.SNAPSHOT,
                        decoder: {
                            space: 'ens.eth'
                        }
                    }
                ]
            }
        }
    })

    await prisma.dao.upsert({
        where: { name: 'FWB' },
        update: {},
        create: {
            name: 'FWB',
            picture: '/assets/Project_Icons/friends-with-benefits',
            handlers: {
                create: [
                    {
                        type: DAOHandlerType.SNAPSHOT,
                        decoder: {
                            space: 'friendswithbenefits.eth'
                        }
                    }
                ]
            }
        }
    })

    await prisma.dao.upsert({
        where: { name: 'GnosisDAO' },
        update: {},
        create: {
            name: 'GnosisDAO',
            picture: '/assets/Project_Icons/gnosis',
            handlers: {
                create: [
                    {
                        type: DAOHandlerType.SNAPSHOT,
                        decoder: {
                            space: 'gnosis.eth'
                        }
                    }
                ]
            }
        },
        include: {
            handlers: true
        }
    })

    await prisma.dao.upsert({
        where: { name: 'Index Coop' },
        update: {},
        create: {
            name: 'Index Coop',
            picture: '/assets/Project_Icons/index-coop',
            handlers: {
                create: [
                    {
                        type: DAOHandlerType.SNAPSHOT,
                        decoder: {
                            space: 'index-coop.eth'
                        }
                    }
                ]
            }
        }
    })

    await prisma.dao.upsert({
        where: { name: 'Paladin' },
        update: {},
        create: {
            name: 'Paladin',
            picture: '/assets/Project_Icons/paladin',
            handlers: {
                create: [
                    {
                        type: DAOHandlerType.SNAPSHOT,
                        decoder: {
                            space: 'palvote.eth'
                        }
                    }
                ]
            }
        }
    })

    await prisma.dao.upsert({
        where: { name: 'Sushi' },
        update: {},
        create: {
            name: 'Sushi',
            picture: '/assets/Project_Icons/sushiswap',
            handlers: {
                create: [
                    {
                        type: DAOHandlerType.SNAPSHOT,
                        decoder: {
                            space: 'sushigov.eth'
                        }
                    }
                ]
            }
        }
    })

    await prisma.dao.upsert({
        where: { name: 'Instadapp' },
        update: {},
        create: {
            name: 'Instadapp',
            picture: '/assets/Project_Icons/instadapp',
            handlers: {
                create: [
                    {
                        type: DAOHandlerType.SNAPSHOT,
                        decoder: {
                            space: 'instadapp-gov.eth'
                        }
                    }
                ]
            }
        }
    })

    await prisma.dao.upsert({
        where: { name: 'Gitcoin' },
        update: {},
        create: {
            name: 'Gitcoin',
            picture: '/assets/Project_Icons/gitcoin',
            handlers: {
                create: [
                    {
                        type: DAOHandlerType.SNAPSHOT,
                        decoder: {
                            space: 'gitcoindao.eth'
                        }
                    },
                    {
                        type: DAOHandlerType.GITCOIN_CHAIN,
                        chainindex: 12497482,
                        decoder: {
                            address:
                                '0xDbD27635A534A3d3169Ef0498beB56Fb9c937489',
                            proposalUrl:
                                'https://www.tally.xyz/gov/gitcoin/proposal/'
                        }
                    }
                ]
            }
        }
    })

    await prisma.dao.upsert({
        where: { name: 'Gearbox' },
        update: {},
        create: {
            name: 'Gearbox',
            picture: '/assets/Project_Icons/gearbox',
            handlers: {
                create: [
                    {
                        type: DAOHandlerType.SNAPSHOT,
                        decoder: {
                            space: 'gearbox.eth'
                        }
                    }
                ]
            }
        }
    })

    await prisma.dao.upsert({
        where: { name: 'Euler' },
        update: {},
        create: {
            name: 'Euler',
            picture: '/assets/Project_Icons/euler',
            handlers: {
                create: [
                    {
                        type: DAOHandlerType.SNAPSHOT,
                        decoder: {
                            space: 'eulerdao.eth'
                        }
                    }
                ]
            }
        }
    })

    await prisma.dao.upsert({
        where: { name: 'Aura Finance' },
        update: {},
        create: {
            name: 'Aura Finance',
            picture: '/assets/Project_Icons/aura-finance',
            handlers: {
                create: [
                    {
                        type: DAOHandlerType.SNAPSHOT,
                        decoder: {
                            space: 'aurafinance.eth'
                        }
                    }
                ]
            }
        }
    })

    await prisma.dao.upsert({
        where: { name: 'Developer DAO' },
        update: {},
        create: {
            name: 'Developer DAO',
            picture: '/assets/Project_Icons/developerdao',
            handlers: {
                create: [
                    {
                        type: DAOHandlerType.SNAPSHOT,
                        decoder: {
                            space: 'devdao.eth'
                        }
                    }
                ]
            }
        }
    })

    await prisma.dao.upsert({
        where: { name: 'APWine' },
        update: {},
        create: {
            name: 'APWine',
            picture: '/assets/Project_Icons/APWine',
            handlers: {
                create: [
                    {
                        type: DAOHandlerType.SNAPSHOT,
                        decoder: {
                            space: 'apwine.eth'
                        }
                    }
                ]
            }
        }
    })

    await prisma.dao.upsert({
        where: { name: 'Morpho' },
        update: {},
        create: {
            name: 'Morpho',
            picture: '/assets/Project_Icons/morpho',
            handlers: {
                create: [
                    {
                        type: DAOHandlerType.SNAPSHOT,
                        decoder: {
                            space: 'morpho.eth'
                        }
                    }
                ]
            }
        }
    })

    await prisma.dao.upsert({
        where: { name: 'Lido DAO' },
        update: {},
        create: {
            name: 'Lido DAO',
            picture: '/assets/Project_Icons/lido',
            handlers: {
                create: [
                    {
                        type: DAOHandlerType.SNAPSHOT,
                        decoder: {
                            space: 'lido-snapshot.eth'
                        }
                    }
                ]
            }
        }
    })

    await prisma.dao.upsert({
        where: { name: 'Starknet' },
        update: {},
        create: {
            name: 'Starknet',
            picture: '/assets/Project_Icons/starknet',
            handlers: {
                create: [
                    {
                        type: DAOHandlerType.SNAPSHOT,
                        decoder: {
                            space: 'starknet.eth'
                        }
                    }
                ]
            }
        }
    })

    await prisma.dao.upsert({
        where: { name: 'Arbitrum DAO' },
        update: {},
        create: {
            name: 'Arbitrum DAO',
            picture: '/assets/Project_Icons/arbitrum',
            handlers: {
                create: [
                    {
                        type: DAOHandlerType.SNAPSHOT,
                        decoder: {
                            space: 'arbitrumfoundation.eth'
                        }
                    }
                ]
            }
        }
    })

    await prisma.dao.upsert({
        where: { name: 'dOrg' },
        update: {},
        create: {
            name: 'dOrg',
            picture: '/assets/Project_Icons/dOrg',
            handlers: {
                create: [
                    {
                        type: DAOHandlerType.SNAPSHOT,
                        decoder: {
                            space: 'dorg.eth'
                        }
                    }
                ]
            }
        }
    })

    console.log('Inserting seed user')
    const seedUser = await prisma.user.upsert({
        where: {
            name: '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF'
        },
        create: {
            name: '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF',
            dailybulletin: true
        },
        update: {
            name: '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF',
            newuser: false
        }
    })

    console.log('Inserting subscriptions')
    const alldaos = await prisma.dao.findMany({})

    await prisma.subscription.createMany({
        data: alldaos.map((dao) => {
            return {
                userid: seedUser.id,
                daoid: dao.id
            }
        }),
        skipDuplicates: true
    })
}

const seedVoters = async () => {
    const voters = [
        '0xB7BD14E2497cdC57675E896af84ecB652D294AD1'
        // '0x5B3bFfC0bcF8D4cAEC873fDcF719F60725767c98',
        // '0xaa3E78E700F93C7b81553a7D7c10899ba5349bC5',
        // '0xb55a948763e0d386b6dEfcD8070a522216AE42b1',
        // '0x070341aA5Ed571f0FB2c4a5641409B1A46b4961b',
        // '0x7Ddb50A5b15AeA7e7cf9aC8E55a7F9fd9d05ecc6',
        // '0xdd00Cc906B93419814443Bb913949d503B3DF3c4',
        // '0x4fd9D0eE6D6564E80A9Ee00c0163fC952d0A45Ed',
        // '0x2D7d6Ec6198ADFD5850D00BD601958F6E316b05E',
        // '0x5e349eca2dc61aBCd9dD99Ce94d04136151a09Ee',
        // '0xd21f1d10a06BF0ACE76810aE1A2c15760521085E',
        // '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        // '0xa93Ae3a2cE1714F422eC2d799c48A56b2035C872',
        // '0xDAFEA492D9c6733ae3d56b7Ed1ADB60692c98Bc5',
        // '0xe5cedE505f026b35E9b948ffC82E0E4B230D1EbE',
        // '0x4ECf99082dA0be35D71647A4d443CCD0d7601539',
        // '0x68DdaF70303e0668A6259a3Ead090d0b0A779fc8',
        // '0x17A4744D1bDcfBEb5e5aD8844ec64DEF89db3Ce0',
        // '0x8804d391472126dA56b9a560AEf6C6d5AAA7607B',
        // '0x84b05B0a30B6AE620F393D1037f217e607AD1B96',
        // '0xf60D7a62C98F65480725255e831DE531EFe3fe14',
        // '0x40f784B16b2D405eFD4E9eB7d0663398D7d886FB',
        // '0xd2362DbB5Aa708Bc454Ce5C3F11050C016764fA6',
        // '0xB0B829a6AaE0F7e59B43391b2C8a1CFD0C801c8C',
        // '0x06e8dedf9e1adB1EbA32f36ea9223770ba378B77',
        // '0xD0Df93fC03a7291e31947F5cC6ef526f5B67B0ea',
        // '0xD9D00c42BeD99A6D3a0F2902c640BCCCEECF6C29',
        // '0x7AE109A63ff4DC852e063a673b40BED85D22E585',
        // '0xB8dF77C3Bd57761bD0C55D2F873d3Aa89b3dA8B7',
        // '0xaa19f47e6aCb02dF88efA9f023F2A38412069902',
        // '0x797D63cB6709c79b9eCA99d9585eA613DA205156',
        // '0xF1792852BF860b4ef84a2869DF1550BC80eC0aB7',
        // '0xCdB792c14391F7115Ba77A7Cd27f724fC9eA2091',
        // '0x92e1Ca8b69A44bB17aFA92838dA68Fc41f12250a',
        // '0x316090e23CC44e70245BA9846404413ACA2Df16F',
        // '0x2C511D932C5a6fE4071262D49bfc018cfBaAa1F5',
        // '0x0f4Be9f208C552A6b04d9A1222F385785f95beAA',
        // '0xE89f973A19Cd76C3e5e236062668e43042176638',
        // '0xB4b82978FCe6d26A22deA7E653Bb9ce8e14f8056',
        // '0x9301F3bB7A71Ab4d46b17BD1F8254142fa8F26AD',
        // '0xAFaFF1a605C373B43727136c995D21A7fCD08989',
        // '0xB056E45fD47d962f4eF25714714ABc7A79886064',
        // '0xD1fc89E0c3828F50b650E1309e30CB4fcF2bdBe3',
        // '0xea172676E4105e92Cc52DBf45fD93b274eC96676',
        // '0x2ad55394E12016c510D3C35d91Da7d90A758b7FD',
        // '0x512fce9B07Ce64590849115EE6B32fd40eC0f5F3',
        // '0x9f74662aD05840Ba35d111930501c617920dD68e',
        // '0x25B70c8050B7e327Ce62CfD80A0C60cCcf057Fa6',
        // '0xff0281256B2A478905B79895c1A2038A679E1751',
        // '0x82e5a7441870FB67DA9B9be3B135DA1303bB464E',
        // '0x62a43123FE71f9764f26554b3F5017627996816a',
        // '0xa6e8772af29b29B9202a073f8E36f447689BEef6',
        // '0xdC1F98682F4F8a5c6d54F345F448437b83f5E432',
        // '0xf9551c66995eD3Ff9bb05C9Fd7ff148Bd75dc99a',
        // '0x8C28Cf33d9Fd3D0293f963b1cd27e3FF422B425c',
        // '0x099F8498348792AbE502eC12f6163254dbBe321E',
        // '0x8F73bE66CA8c79382f72139be03746343Bf5Faa0',
        // '0xA2b15ce187165bC1723Df411d9887d738FabE5f7',
        // '0xb9f4cdd9eDe4f8CB42A1a8348397487973C62509',
        // '0x9A048A7BF38306c055C05606A6010C78CFc7C1E8',
        // '0xF4B0556B9B6F53E00A1FDD2b0478Ce841991D8fA',
        // '0x8C5f9c67028fAaE0Db258D44507BdfBD7A9de223',
        // '0x5D025814b6a21Cd6fcb4112F40f88bC823e6A9ab',
        // '0xE594469fDe6AE29943a64f81d95c20F5F8eB2e04',
        // '0x1A929b5d550C45ca8A0cFDB82F7c9C15FC278f31',
        // '0x0E1774FD4f836E6Ba2E22d0e11F4c69684ae4EB7',
        // '0x981CaC16246D9641bE07BbA6E19E304b74B173BC',
        // '0x020C117135c05b7D0122Cece593335938a579303',
        // '0xf943EBFA33d63376123335ad2096AEe6d3aC1374',
        // '0xDE3ba1B41e6c612a3Ca3213B84bdaf598dfFdb9b',
        // '0x46abFE1C972fCa43766d6aD70E1c1Df72F4Bb4d1',
        // '0x406b607644c5D7BfDA95963201E45A4c6AB1c159',
        // '0x2B888954421b424C5D3D9Ce9bB67c9bD47537d12',
        // '0x64cc60a9F6F97ddCb8ac1378dA9390b85Be6dA37',
        // '0x683a4F9915D6216f73d6Df50151725036bD26C02',
        // '0xB83b3e9C8E3393889Afb272D354A7a3Bd1Fbcf5C',
        // '0x329c54289Ff5D6B7b7daE13592C6B1EDA1543eD4',
        // '0x1B686eE8E31c5959D9F5BBd8122a58682788eeaD',
        // '0x1de2A056508E0D0dd88A88f1f5cdf9cfa510795c',
        // '0x94Db037207F6fB697DBd33524aaDffD108819DC8',
        // '0xB1EA5a3E5EA7fA1834d48058EcDa26d8c59e8251',
        // '0x429F9aDA43e9F345CbB85EC88681BB70Df808892',
        // '0xA56DfbE8010a8830a9Fe5B56e8efF7236e277120',
        // '0x75536CF4f01c2bFa528F5c74DdC1232Db3aF3Ee5',
        // '0x45a10F35BeFa4aB841c77860204b133118B7CcAE',
        // '0x6cea573473348367A5f66e0f261BFA25799E6a60',
        // '0x839395e20bbB182fa440d08F850E6c7A8f6F0780',
        // '0x9e5B45e4872DE2Ee4b6ffBd06b3735501826B032',
        // '0x8f07bc36ff569312FDC41F3867D80bBd2FE94b76',
        // '0x13838884271ec954CB036D0B29D404afab5EAe2A',
        // '0xdb5781a835b60110298fF7205D8ef9678Ff1f800',
        // '0x9b7DF3A2DF61E72dF5C4d565A0E017D7C5c6E532',
        // '0xed11e5eA95a5A3440fbAadc4CC404C56D0a5bb04',
        // '0xdab0d648a2a771e6952916A822dddf738b535f5A',
        // '0x01E6b50557eF1a2ca58A621998aCe3f278E808B8',
        // '0xd23199F1222C418ffC74c385171330B21B16e452',
        // '0x4f41877773e44F2275dA1942FEe898556821bf66',
        // '0xfC61965861b679c5AA728D41Fa6Ea0b29544F554',
        // '0x7899d9b1181cbB427b0b1BE0684C096C260F7474',
        // '0x523d007855B3543797E0d3D462CB44B601274819',
        // '0x0331969e189D63fBc31D771Bb04Ab44227D748D8',
        // '0x1372eDA77Df5A048db8Af4Db3D8680fF56388824',
        // '0x2B384212EDc04Ae8bB41738D05BA20E33277bf33',
        // '0xE3c9eCe23316B6B06142Fa0CA915f02C323C6b21',
        // '0xB49f8b8613bE240213C1827e2E576044fFEC7948',
        // '0x47C125DEe6898b6CB2379bCBaFC823Ff3f614770',
        // '0x0a09cd09B0107Bb98a83f211704F036ECa94B92e',
        // '0x13BDaE8c5F0fC40231F0E6A4ad70196F59138548',
        // '0x88FB3D509fC49B515BFEb04e23f53ba339563981',
        // '0x8d07D225a769b7Af3A923481E1FdF49180e6A265',
        // '0x9C159121CEEBF937E9bad98fd0c895d7f6038bd4',
        // '0x84bb5196F0085D61a7C9AC5B903a26D7f009aC13',
        // '0xe7925D190aea9279400cD9a005E33CEB9389Cc2b',
        // '0x79C4213a328E3B4F1D87b4953C14759399dB25E2',
        // '0x3317AD9eDa6942b5a7BE5BA83346C0Ea82C3C26C',
        // '0xD770d242c5734a3B8028CF46D2A2e980EcE07BeA',
        // '0xBd3496fE269AA8Bbf685836b63b3CadEdbE2EB56',
        // '0xa7f0FF0bc7fb4c60C7C88551172E455d4b11CE74',
        // '0x869eC00FA1DC112917c781942Cc01c68521c415e',
        // '0x17D0BE8CA61077871da5D86566D43eE10AFDE9EE',
        // '0x46808732DF838B1a9612829A1b33411E995c3e0C',
        // '0xC2d3492368d696b3D13dEda3Ec2241E4F31882a3',
        // '0xa50Ec178Bd0B184A890AB6d2e7a757a01Db3a702',
        // '0xd714Dd60e22BbB1cbAFD0e40dE5Cfa7bBDD3F3C8',
        // '0xDf71878436e521e430fACf36ee5e3D74fA519F2c',
        // '0x5b3bffc0bcf8d4caec873fdcf719f60725767c98',
        // '0x7ddb50a5b15aea7e7cf9ac8e55a7f9fd9d05ecc6',
        // '0xb55a948763e0d386b6defcd8070a522216ae42b1',
        // '0x0d07584Dc74A69fB81342F486091074b7EA5AD6c',
        // '0x06ADa798f9323392cA30C755383Af879bd853168',
        // '0x26f41D791733ad797dc65Ff05a4080AE7ec7C481',
        // '0x1D1a13b16667c284b87de62CAEEfF0ce89E342B2',
        // '0xb97605A73C35e3c11A122C64E720c179219a78dB',
        // '0xC3FdAdbAe46798CD8762185A09C5b672A7aA36Bb',
        // '0x49Aa4e8210822CCd50b966944D415e5b4667AE3E',
        // '0x869147940842BB1Aa4c40E60C5e583f4911F2e02',
        // '0x7f96a6269B00c56cdC319721be80bf8C290324a5',
        // '0xDD0000B719376cCcf3e0B0DC4cd89CEEb3CF7Db3',
        // '0x5A384227B65FA093DEC03Ec34e111Db80A040615',
        // '0xeF8305E140ac520225DAf050e2f71d5fBcC543e7',
        // '0x2654c613bCaB7e75ba4FB27c879A2FCCC23eC108',
        // '0xDb1BC3D0E0c436AA39aadD851ADa9472C86f3388',
        // '0x2571b2254620BB471c836675f41f023Bb0B3d84c',
        // '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        // '0x49C604E07338ce062efE23570e9732727Dc55F6f',
        // '0xF923139558d5aB06052755317F3ae8900c1DB7bf',
        // '0xfE9D3B6F60F5cA2c76b4B682E497cF04E26E7257',
        // '0x5f1b912D7C3627b9080e4338C446A8A2976f1fd0',
        // '0xF9d576De84b4591679af9585d025796068B743F5',
        // '0xFEE29bA0A5d31946809E24f5902EC85Ab7C0301A',
        // '0xAE6Ef687e55ccd6EC96d2BF6E67FA51819193AFD',
        // '0x3Ee958c1696B9500303E3E1e8a66C3fE966F97b4',
        // '0x67A16655c1c46f8822726e989751817c49f29054',
        // '0xf4BD4482e3295dAd5D5Fae0DC556D14bCc90ffDc',
        // '0xb36ed58362f483EA8A8237889883f8049BaB8B3e',
        // '0x6cc5b30Cd0A93C1F85C7868f5F2620AB8c458190',
        // '0xeA989AF988ecDCA55C9eEFb6eD9B2afE0852B72D'
    ]

    console.log('Inserting voters')

    await prisma.$transaction(
        voters.map((voter) => {
            return prisma.user.update({
                where: { name: '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF' },
                data: {
                    voters: {
                        connectOrCreate: {
                            where: { address: ethers.getAddress(voter) },
                            create: { address: ethers.getAddress(voter) }
                        }
                    }
                }
            })
        }),
        {
            isolationLevel: 'ReadCommitted'
        }
    )
}

async function main() {
    await seedData()
    await seedVoters()
}

main()
