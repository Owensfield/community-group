new Vue({
    el: '#app',
    data: {
        showTabs: false,
        showUserRenewDialog: false,
        API_BASE_URL: '',
        showUserIds: false,
        showQrCodeDialog: false,
        qrCodeUrl: '',
        activeTab: '',
        user_details: {},
        user_details_test: {},
        activePolls: [],
        pollsInReview: [],
        oldPolls: [],
        suggestPolls: [],
        contactForm: {
            name: "",
            email: "",
            subject: "",
            message: "",
        },
        errors: {},
        captcha: {
            number1: Math.floor(Math.random() * 10), // First random number
            number2: Math.floor(Math.random() * 10), // Second random number
            answer: null, // User-provided answer
        },
        showModal: false,
        showUserCreateDialog: false,
        showUserUpdateDialog: false,
        showUserDeleteDialog: false,
        showPollRunUpdateDialog: false,
        userDialogForm: {
            id: "",
            email: "",
            roll: ""
        },
        deleteUserDialogForm: {
            id: "",
            email: ""
        },
        picked: 0,
        newPoll: {
            title: '',
            choices: ''
        },
        approvedPoll: "",
        notification: {
            message: '',
            show: false
        },
        success_notification: {
            message: '',
            show: false
        },
        users: [],
        newUser: {
            email: '',
            roll: 0
        },
        qrCodeToShow: "",
        deleteUserData: {
            user_id: ''
        },
        conditionsData: {
            quorum: 0,
            threshold: 0
        },
        docs: [],
        resendLinkEmail: "",
        selectedDoc: null,
        showDialog: false,
        showEmailAllDialog: false,
        emailAllForm: {
            subject: '',
            message: ''
        },

    },
    computed: {
        parsedContent() {
            return this.selectedDoc ? marked.parse(this.selectedDoc.content) : '';
        },
        docsGroupedByYear() {
            return this.docs.reduce((groups, doc) => {
                const year = doc.year;
                if (!groups[year]) {
                    groups[year] = [];
                }
                groups[year].push(doc);
                return groups;
            }, {});
        }
    },
    methods: {
        showQrCode(userId) {
            this.qrCodeUrl = `https://owensfield.wales?id=${userId}`;
            this.showQrCodeDialog = true;
          
            this.$nextTick(() => {
              // Clear previous QR code
              const qrContainer = document.getElementById('qrcode');
              qrContainer.innerHTML = '';
          
              // Generate QR code
              new QRCode(qrContainer, {
                text: this.qrCodeUrl,
                width: 200,
                height: 200
              });
            });
          },          
        async resendLink(resendLinkEmail) {
            try {
                const response = await fetch(`${this.API_BASE_URL}/resend?email=` + resendLinkEmail, {
                    method: 'get',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                this.showSuccessNotification('Email sent, check your inbox.');
            } catch (error) {
                this.showNotification(error);
            }
        },
        async sendEmailAllUsers() {
            try {
                const payload = {
                    subject: this.emailAllForm.subject,
                    message: this.emailAllForm.message
                };

                const response = await fetch(`${this.API_BASE_URL}/email_all_users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }

                this.showSuccessNotification('Mass email sent!');
                this.showEmailAllDialog = false;
                this.emailAllForm.subject = '';
                this.emailAllForm.message = '';
            } catch (error) {
                this.showNotification('There was an error sending the email.');
                console.error('Error sending mass email:', error);
            }
        },
        openTab(evt, tabName) {
            this.activeTab = tabName;  // <-- track active tab

            var i, tabcontent, tablinks;
            tabcontent = document.getElementsByClassName("tabcontent");
            for (i = 0; i < tabcontent.length; i++) {
                tabcontent[i].style.display = "none";
            }
            tablinks = document.getElementsByClassName("tablinks");
            for (i = 0; i < tablinks.length; i++) {
                tablinks[i].className = tablinks[i].className.replace(" active", "");
            }

            var cityElement = document.getElementById(tabName);
            if (cityElement) {
                cityElement.style.display = "block";
                if (evt) {
                    evt.currentTarget.className += " active";
                } else {
                    // No event — set the correct button manually
                    var defaultButton = Array.from(tablinks).find(btn => btn.textContent.trim().startsWith('Active'));
                    if (defaultButton) {
                        defaultButton.className += " active";
                    }
                }
            } else {
                console.error(`Element not found.`);
            }
        },
        async updatePoll(updateData) {
            console.log(updateData);
            try {
                const response = await fetch(`${this.API_BASE_URL}/poll`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateData)
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                const data = await response.json();
                this.showSuccessNotification('Poll updated successfully.');
                this.getAllPolls(userId);
            } catch (error) {
                this.showNotification(error);
            }
        },
        async showPollUpdateRunDialog(poll) {
            this.showPollRunUpdateDialog = true;
            this.updatePollRun = poll;
        },
        async pollRunUpdate(updateData) {
            dataToSend = {
                id: updateData.id,
                admin_id: this.user_details.id,
                duration: parseInt(updateData.duration),
                complete: (updateData.complete == "true")
            }
            console.log(dataToSend)
            try {
                const response = await fetch(`${this.API_BASE_URL}/polls/run`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(dataToSend)
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                this.getAllPolls(this.user_details.id);
                this.showPollRunUpdateDialog = false
                this.showSuccessNotification('Poll updated successfully.');
                this.getAllPolls(userId);
            } catch (error) {
                this.showNotification(error);
            }
        },
        async renewMembership() {
            this.user_details.renew = false;
            this.user_details.active = true;
            data = {
                id: this.user_details.id,
                renew: this.user_details.renew,
                active: this.user_details.active
            }
            this.updateUser(data);
        },
        async cancelMembership() {
            this.user_details.renew = true;
            this.user_details.active = false;
            data = {
                id: this.user_details.id,
                renew: this.user_details.renew,
                active: this.user_details.active
            }
            this.updateUser(data);
        },
        async updateUser(data) {
            self = this
            if(data.email) {
                data.admin_id = this.user_details.id;
            }
            try {
                const response = await fetch(`${this.API_BASE_URL}/user`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                if(data.email) {
                  this.getUsers();
                }
                this.showSuccessNotification('User updated.');
                this.showUserUpdateDialog = false;
                if (data.active) {
                    this.showUserRenewDialog = false;
                }
            } catch (error) {
                this.showNotification(error);
            }
        },
        async openUpdateUserDialog(updateData) {
            this.showUserUpdateDialog = true;
            this.userDialogForm.id = updateData.id;
            this.userDialogForm.email = updateData.email;
            this.userDialogForm.roll = updateData.roll;
        },
        async openDeleteUserDialog(deleteData) {
            this.showUserDeleteDialog = true;
            this.deleteUserDialogForm.id = deleteData.id;
            this.deleteUserDialogForm.email = deleteData.email;
        },
        async getUser(userId) {
            self = this;
            try {
                const response = await fetch(`${this.API_BASE_URL}/user?user_id=${userId}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                this.fetchDocs(userId);

                const data = await response.json();
                self.showTabs = true;
                self.user_details = data;
                console.log(this.user_details)
                this.showSuccessNotification('Logged in.');
                this.getAllPolls(userId);

                this.$nextTick(() => {
                    this.openTab(null, 'Active');
                    console.log("user_details after fetch", self.user_details);
                    console.log("user_details.renew", self.user_details.renew);
                    if (self.user_details.renew) {
                        this.showUserRenewDialog = true
                    }
                });

                
                if (self.user_details.roll > 0) {
                    this.getUsers(userId);
                }
                this.getConditions();
            } catch (error) {
                this.showNotification('There was an error logging in, please try again with correct ID.');
                console.error('There has been a problem with your fetch operation:', error);
            }
        },
        async getUsers() {
            self = this;
            try {
                const response = await fetch(`${this.API_BASE_URL}/users?user_id=${self.user_details.id}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }

                const data = await response.json();
                console.log(data)
                self.users = data;
                // Process the data as needed
            } catch (error) {
                this.showNotification('There was an error fetching users, please try again.');
                console.error('There has been a problem with your fetch operation:', error);
            }
        },
        async getConditions() {
            self = this;
            try {
                const response = await fetch(`${this.API_BASE_URL}/conditions`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }

                const data = await response.json();
                console.log(data)
                self.conditionsData = data;
                // Process the data as needed
            } catch (error) {
                console.error('There has been a problem fetching conditions:', error);
            }
        },
        async conditionsUpdate() {
            self = this
            this.conditionsData.user_id = this.user_details.id;
            console.log(this.conditionsData);
            try {
                const response = await fetch(`${this.API_BASE_URL}/conditions`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(this.conditionsData)
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                const data = await response.json();
                self.conditionsData = data;
                this.showSuccessNotification('Conditions updated.');
            } catch (error) {
                this.showNotification(error);
            }
        },
        convertLinks(text) {
            const urlPattern = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
            return text.replace(urlPattern, '<a href="$1" target="_blank">$1</a>');
        },
        async getAllPolls(userId) {
            self = this;
            try {
                const response = await fetch(`${this.API_BASE_URL}/polls?user_id=${userId}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }

                const data = await response.json();

                // Process the polls to split choices and format them
                const processedPolls = data.map(poll => {
                    const choices = JSON.parse(poll.choices);
                    return {
                        ...poll,
                        choices: choices
                    };
                });

                // Split the polls into activePolls, pollsInReview, and oldPolls
                self.activePolls = processedPolls.filter(poll => poll.confirms >= 4 && !poll.complete);
                self.pollsInReview = processedPolls.filter(poll => poll.confirms < 4 && !poll.complete);
                self.oldPolls = processedPolls.filter(poll => poll.complete).map(poll => {
                    const maxVotes = Math.max(...poll.choices.map(choice => choice[1]));
                    const topChoices = poll.choices.filter(choice => choice[1] === maxVotes);

                    let resultChoices = poll.choices.map(choice => {
                        return {
                            name: choice[0],
                            votes: choice[1],
                            isTopChoice: choice[1] === maxVotes
                        };
                    });

                    resultChoices.sort((a, b) => b.votes - a.votes); // Sort choices by votes in descending order

                    const result = {
                        ...poll,
                        choices: resultChoices
                    };

                    if (topChoices.length > 1) {
                        result.choice = "Draw: " + topChoices.map(choice => choice[0]).join(", ");
                    } else {
                        result.choice = "Winner: " + topChoices[0][0];
                    }

                    return result;
                });
            } catch (error) {
                this.showNotification('There was an error fetching polls, please try again.');
                console.error('There has been a problem with your fetch operation:', error);
            }
        },
        async createUser() {
            try {
                const response = await fetch(`${this.API_BASE_URL}/user`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        admin_id: this.user_details.id,
                        email: this.userDialogForm.email,
                        roll: this.userDialogForm.roll
                    })
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }

                const data = await response.json();
                this.showSuccessNotification('User created successfully.');
                this.showUserCreateDialog = false
                this.getUsers();
            } catch (error) {
                this.showNotification('There was an error creating the user, please try again.');
                console.error('There has been a problem with your fetch operation:', error);
            }
        },
        validateForm() {
            this.errors = {}; // Clear previous errors
            let isValid = true;

            // Validate Name
            if (!this.contactForm.name) {
                this.errors.name = "Name is required.";
                isValid = false;
            }

            // Validate Email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!this.contactForm.email) {
                this.errors.email = "Email is required.";
                isValid = false;
            } else if (!emailRegex.test(this.contactForm.email)) {
                this.errors.email = "Please enter a valid email address.";
                isValid = false;
            }

            // Validate Subject
            if (!this.contactForm.subject) {
                this.errors.subject = "Subject is required.";
                isValid = false;
            }

            // Validate Message
            if (!this.contactForm.message) {
                this.errors.message = "Message is required.";
                isValid = false;
            }

            // Validate Captcha
            const correctAnswer = this.captcha.number1 + this.captcha.number2;
            if (this.captcha.answer === null || this.captcha.answer !== correctAnswer) {
                this.errors.captcha = "Incorrect answer to the equation.";
                isValid = false;
            }

            return isValid;
        },
        async sendContactForm() {
            if (!this.validateForm()) {
                throw new Error('Something is wrong with the form');
            }
            try {
                const response = await fetch(`${this.API_BASE_URL}/contactform`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(this.contactForm)
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                this.contactForm = {
                    name: "",
                    email: "",
                    subject: "",
                    message: "",
                };
                this.captcha.answer = null
                this.showSuccessNotification('Email sent. Thank you.');
            } catch (error) {
                this.showNotification('There was an error creating the user, please try again.');
                console.error('There has been a problem with your fetch operation:', error);
            }
        },
        async deleteUser(deleteData) {
            try {
                const response = await fetch(this.API_BASE_URL + '/user' + '?user_id=' + deleteData.id, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }

                const data = await response.json();
                this.showSuccessNotification('User deleted successfully.');
                this.getUsers();
                this.showUserDeleteDialog = false
            } catch (error) {
                this.showNotification('There was an error deleting the user, please try again.');
                console.error('There has been a problem with your fetch operation:', error);
            }
        },
        async deletePoll(pollId) {
            try {
                const response = await fetch(this.API_BASE_URL + '/poll?poll_id=' + pollId + '&user_id=' + this.user_details.id, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }

                const data = await response.json();

                this.getAllPolls(this.user_details.id);
                this.showSuccessNotification('Poll deleted.');
            } catch (error) {
                this.showNotification('There was an error submitting the poll. Please try again.');
            }
        },
        showNotification(message) {
            this.notification.message = '';
            this.notification.message = message;
            this.notification.show = true;
            setTimeout(() => {
                this.notification.show = false;
            }, 5000);
        },
        showSuccessNotification(message) {
            this.success_notification.message = '';
            this.success_notification.message = message;
            this.success_notification.show = true;
            setTimeout(() => {
                this.success_notification.show = false;
            }, 5000);
        },
        getVotePercentage(poll, choice) {
            const totalVotes = poll.choices.reduce((sum, choice) => sum + choice[1], 0);
            return totalVotes ? (choice[1] / totalVotes) * 100 : 0;
        },
        async submitPoll() {
            this.sanitizeChoices();
            const pollData = {
                user_id: this.user_details.id,
                title: this.newPoll.title,
                choices: this.newPoll.choices,
            };
            try {
                const response = await fetch(this.API_BASE_URL + '/poll', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(pollData)
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }

                const data = await response.json();
                this.showSuccessNotification('Poll submitted successfully.');
                this.getAllPolls(pollData.user_id);
                // Optionally, clear the form fields after successful submission
                this.newPoll.title = '';
                this.newPoll.choices = '';
            } catch (error) {
                this.showNotification('There was an error submitting the poll. Please try again.');
            }
        },
        sanitizeChoices() {
            for (let i = 0; i < this.newPoll.choices.length; i++) {
                this.newPoll.choices[i] = this.newPoll.choices[i].replace(/,/g, ';');
            }
        },
        async startFunct() {
            const urlParams = new URLSearchParams(window.location.search);
            userId = urlParams.get('id');

            // set in localstorge otherwise checkit exists and use
            if (userId) {
                localStorage.setItem("userId", userId);
                this.getUser(userId);
            }
            else {
                userId = localStorage.getItem("userId");
                if (userId) {
                    await this.getUser(userId);
                }
            }
            // remove the ID
            if (urlParams.has('id')) {
                urlParams.delete('id');
                const newUrl = window.location.pathname + '?' + urlParams.toString();
                if (!urlParams.toString()) {
                    window.history.replaceState(null, '', window.location.pathname);
                } else {
                    window.history.replaceState(null, '', newUrl);
                }
            }
        },
        async fetchDocs(userId) {
            try {
                const response = await fetch(`${this.API_BASE_URL}/api/docs?user_id=${userId}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                const data = await response.json();

                this.docs = data.map(doc => {
                    const dateObj = doc.date ? new Date(doc.date) : null;
                    const year = dateObj ? dateObj.getFullYear() : 'Unknown';
                    return {
                        ...doc,
                        type: doc.name.endsWith('.pdf') ? 'pdf' : 'markdown',
                        date: dateObj,
                        year: year
                    };
                });

                // sort newest first
                this.docs.sort((a, b) => b.date - a.date);

            } catch (error) {
                console.error('Error fetching docs:', error);
            }
        },
        async handleDocClick(doc) {
            try {
                if (doc.type === 'pdf') {
                    this.selectedDoc = {
                        name: doc.name,
                        content: `${this.API_BASE_URL}/api/docs/${doc.name}?user_id=${this.user_details.id}`,
                        type: 'pdf',
                    };
                } else if (doc.type === 'markdown') {
                    const response = await fetch(`${this.API_BASE_URL}/api/docs/${doc.name}?user_id=${this.user_details.id}`);
                    if (!response.ok) {
                        throw new Error('Failed to fetch content');
                    }
                    const content = await response.text();
                    this.selectedDoc = {
                        name: doc.name,
                        content,
                        type: 'markdown',
                    };
                }
                this.showDialog = true;
            } catch (error) {
                console.error('Error handling document click:', error);
            }
        }
    },
    async created() {
        try {
            const response = await fetch("js/config.json");
            const config = await response.json();
            this.API_BASE_URL = config.API_BASE_URL;
            console.log(this.API_BASE_URL);
    
            // Call startFunct only after API_BASE_URL is set
            await this.startFunct();
        } catch (error) {
            console.error('Error fetching config:', error);
        }
    
        console.log(this.user_details);
    },
    mounted() {
        this.notification.message = '';
        var slideIndex = 1;
        showDivs(slideIndex);

        // Auto-scroll every 3 seconds
        setInterval(function () {
            plusDivs(1);
        }, 3000);

        function plusDivs(n) {
            showDivs(slideIndex += n);
        }

        function currentDiv(n) {
            showDivs(slideIndex = n);
        }

        function showDivs(n) {
            var i;
            var x = document.getElementsByClassName("mySlides");
            var dots = document.getElementsByClassName("demodots");
            if (n > x.length) { slideIndex = 1 }
            if (n < 1) { slideIndex = x.length }
            for (i = 0; i < x.length; i++) {
                x[i].style.display = "none";
            }
            for (i = 0; i < dots.length; i++) {
                dots[i].className = dots[i].className.replace(" w3-white", "");
            }
            x[slideIndex - 1].style.display = "block";
        }
        self = this;
        this.notification.show = false;
    }
});