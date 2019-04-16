from unittest import TestCase
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
import time
from timeit import default_timer as timer
from selenium.common.exceptions import ElementNotVisibleException


class FunctionalTest1(TestCase):
    def setUp(self):
        """Set up our test browser."""
        options = Options()
        options.add_argument("--headless")
        self.driver = webdriver.Chrome(
            options=options,
            executable_path='./chromedriver'
        )

    def tearDown(self):
        """Shut down our test browser."""
        self.driver.close()
        self.driver.quit()

    @staticmethod
    def severe_and_unexpected(message):
        """Checks whether a message is both severe and unexpected (i.e. non-trivial)."""
        return message['level'] == 'SEVERE' and 'favicon.ico - Failed to load' not in message['message']

    def wait_for_page_to_initialise(self, timeout=15):
        """Wait for the page to finish its set-up."""
        start = timer()
        while True:
            if self.driver.execute_script("return window.initialEvalIsCompleted;"):
                break
            if timer() - start > timeout:  # Time in seconds
                raise Exception("page didn't finish loading quickly enough")
            else:
                time.sleep(0.1)

    def test_no_errors_index(self):
        """Test that there are no JavaScript errors."""
        self.driver.get("http://localhost:8009")

        browser_log = self.driver.get_log('browser')
        browser_errors = [message for message in browser_log if self.severe_and_unexpected(message)]
        self.assertListEqual(browser_errors, [])

    def test_no_errors_focus(self):
        """Test that there are no errors on the first page if we focus a couple of CodeMirror divs."""
        self.driver.get("http://localhost:8009/1-1-elements.html")
        self.wait_for_page_to_initialise()

        # Trigger the onFocus callback
        try:
            clicks = []
            code_mirror = self.driver.find_elements_by_xpath('//div/div[@class="CodeMirror"]')
            if len(code_mirror) > 0:
                clicks.append(code_mirror[0])
                code_mirror[0].click()

                if len(code_mirror) > 1:
                    clicks.append(code_mirror[1])
                    code_mirror[1].click()

        except ElementNotVisibleException as err:
            print(err)
            print(clicks)

        browser_log = self.driver.get_log('browser')
        browser_errors = [message for message in browser_log if self.severe_and_unexpected(message)]
        self.assertListEqual(browser_errors, [])

    def test_no_errors_other_pages(self):
        """Test that there are no JavaScript errors."""
        next_url = "http://localhost:8009/1-0-abstractions.html"
        pages_tested = 0
        while True:
            # print("Checking for JS errors on {}".format(next_url))
            self.driver.get(next_url)
            self.wait_for_page_to_initialise()

            # The 'browser' log is anything sent to console.log()
            browser_log = self.driver.get_log('browser')
            browser_errors = [message for message in browser_log if self.severe_and_unexpected(message)]
            # print("{} errors".format(len(browser_errors)))
            self.assertListEqual(browser_errors, [])
            pages_tested = pages_tested + 1

            # We are expecting <a href=...> <img src=...> </img> </a>
            right_chevrons = self.driver.find_elements_by_xpath('//a/img[@src="images/chevron-right.svg"]')
            if not len(right_chevrons):
                break
            else:
                next_url = right_chevrons[0].find_element_by_xpath('..').get_attribute("href")
        print("{} {} tested".format(pages_tested, "page" if pages_tested == 1 else "pages"))
