/// <reference types="cypress" />

describe('login', () => {
    beforeEach(() => {
        cy.visit('http://localhost:3000/daos')
    })

    it('it should do wallet connect', () => {
        /* ==== Generated with Cypress Studio ==== */
        cy.contains('Connect Wallet').click()
        cy.contains('MetaMask').click()
        cy.acceptMetamaskAccess()
        cy.contains('Send message').click()
        cy.confirmMetamaskSignatureRequest()
        cy.get('[data-testid="rk-account-button"]').should(
            'contain.text',
            '🍣0xf3…2266'
        )
        /* ==== End Cypress Studio ==== */
    })

    it('it should do wallet connect again', () => {
        /* ==== Generated with Cypress Studio ==== */
        cy.contains('Connect Wallet').click()
        cy.contains('Send message').click()
        cy.confirmMetamaskSignatureRequest()
        cy.get('[data-testid="rk-account-button"]').should(
            'contain.text',
            '🍣0xf3…2266'
        )
        /* ==== End Cypress Studio ==== */
    })
})

export {}
