from playwright.sync_api import sync_playwright, expect

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the running application
        page.goto("http://localhost:3000")

        # The main content is inside a canvas. We'll wait for it to be visible.
        canvas = page.locator('canvas')
        expect(canvas).to_be_visible(timeout=10000) # Wait up to 10 seconds

        # Give the particles a moment to appear and animate
        page.wait_for_timeout(2000)

        # Take a screenshot to verify the particle system is rendering
        page.screenshot(path="jules-scratch/verification/verification.png")

        browser.close()

if __name__ == "__main__":
    run_verification()