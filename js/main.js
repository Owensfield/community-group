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
        activePolls: [],
        pollsInReview: [],
        oldPolls: [],
        contactForm: {
            name: "",
            email: "",
            subject: "",
            message: "",
        },
        errors: {},
        captcha: {
            number1: Math.floor(Math.random() * 10),
            number2: Math.floor(Math.random() * 10),
            answer: null,
        },
        showUserCreateDialog: false,
        showUserUpdateDialog: false,
        showUserDeleteDialog: false,
        showPollRunUpdateDialog: false,
        updatePollRun: {},
        userDialogForm: {
            id: "",
            email: "",
            roll: ""
        },
        deleteUserDialogForm: {
            id: "",
            email: ""
        },
        newPoll: {
            title: '',
            choices: '',
            duration: 1
        },
        notification: {
            message: '',
            show: false
        },
        success_notification: {
            message: '',
            show: false
        },
        users: [],
        conditionsData: {
            quorum: 0,
            threshold: 0
        },
        docs: [],
        docsLoading: false,
        docsPagination: {
            page: 1,
            pageSize: 12,
            total: 0
        },
        resendLinkEmail: "",
        selectedDoc: null,
        showDialog: false,
        showEmailAllDialog: false,
        emailAllForm: {
            subject: '',
            message: ''
        },
        pollsLoading: {
            active: false,
            review: false,
            old: false
        },
        pollPagination: {
            active: { page: 1, pageSize: 6, total: 0 },
            review: { page: 1, pageSize: 6, total: 0 },
            old: { page: 1, pageSize: 6, total: 0 }
        }
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
        },
        docsYears() {
            const years = Object.keys(this.docsGroupedByYear);
            return years.sort((a, b) => {
                if (a === 'Unknown') return 1;
                if (b === 'Unknown') return -1;
                return b - a;
            });
        },
        docsTotalPages() {
            const totalPages = Math.ceil(this.docsPagination.total / this.docsPagination.pageSize);
            return totalPages || 1;
        }
    },
    methods: {
        buildQuery(params) {
            const search = new URLSearchParams();
            Object.entries(params || {}).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    search.append(key, value);
                }
            });
            const query = search.toString();
            return query ? `?${query}` : '';
        },
        async apiRequest(path, options = {}) {
            const response = await fetch(`${this.API_BASE_URL}${path}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(options.headers || {})
                },
                ...options
            });
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response;
        },
        async apiGet(path, params) {
            const query = this.buildQuery(params);
            return this.apiRequest(`${path}${query}`, { method: 'GET' });
        },
        showQrCode(userId) {
            this.qrCodeUrl = `https://owensfield.wales?id=${userId}`;
            this.showQrCodeDialog = true;

            this.$nextTick(() => {
                const qrContainer = document.getElementById('qrcode');
                qrContainer.innerHTML = '';
                new QRCode(qrContainer, {
                    text: this.qrCodeUrl,
                    width: 200,
                    height: 200
                });
            });
        },
        async resendLink(resendLinkEmail) {
            try {
                await this.apiGet('/resend', { email: resendLinkEmail });
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

                await this.apiRequest('/email_all_users', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });

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
            this.activeTab = tabName;

            const tabcontent = document.getElementsByClassName("tabcontent");
            for (let i = 0; i < tabcontent.length; i++) {
                tabcontent[i].style.display = "none";
            }
            const tablinks = document.getElementsByClassName("tablinks");
            for (let i = 0; i < tablinks.length; i++) {
                tablinks[i].className = tablinks[i].className.replace(" active", "");
            }

            const tabElement = document.getElementById(tabName);
            if (tabElement) {
                tabElement.style.display = "block";
                if (evt) {
                    evt.currentTarget.className += " active";
                } else {
                    const defaultButton = Array.from(tablinks).find(btn => btn.textContent.trim().startsWith('Active'));
                    if (defaultButton) {
                        defaultButton.className += " active";
                    }
                }
            } else {
                console.error(`Element not found.`);
            }

            this.ensureTabData(tabName);
        },
        ensureTabData(tabName) {
            if (!this.user_details.id) {
                return;
            }
            if (tabName === 'Active') {
                this.fetchPolls('active');
            }
            if (tabName === 'Old') {
                this.fetchPolls('old');
            }
            if (tabName === 'Review' && this.user_details.roll > 0) {
                this.fetchPolls('review');
            }
        },
        async updatePoll(updateData) {
            try {
                await this.apiRequest('/poll', {
                    method: 'PUT',
                    body: JSON.stringify(updateData)
                });
                this.showSuccessNotification('Poll updated successfully.');
                if (updateData.confirm) {
                    await this.fetchPolls('review');
                    await this.fetchPolls('active');
                } else {
                    await this.fetchPolls('active');
                }
            } catch (error) {
                this.showNotification(error);
            }
        },
        showPollUpdateRunDialog(poll) {
            this.showPollRunUpdateDialog = true;
            this.updatePollRun = poll;
        },
        async pollRunUpdate(updateData) {
            const dataToSend = {
                id: updateData.id,
                admin_id: this.user_details.id,
                duration: parseInt(updateData.duration, 10),
                complete: (updateData.complete == "true")
            };
            try {
                await this.apiRequest('/polls/run', {
                    method: 'PUT',
                    body: JSON.stringify(dataToSend)
                });
                this.showPollRunUpdateDialog = false;
                this.showSuccessNotification('Poll updated successfully.');
                await this.fetchPolls('active');
                await this.fetchPolls('old');
            } catch (error) {
                this.showNotification(error);
            }
        },
        async renewMembership() {
            const data = {
                id: this.user_details.id,
                renew: false,
                active: true
            };
            this.updateUser(data);
        },
        async cancelMembership() {
            const data = {
                id: this.user_details.id,
                renew: true,
                active: false
            };
            this.updateUser(data);
        },
        async updateUser(data) {
            try {
                if (data.email) {
                    data.admin_id = this.user_details.id;
                }
                await this.apiRequest('/user', {
                    method: 'PUT',
                    body: JSON.stringify(data)
                });
                if (data.email) {
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
        openUpdateUserDialog(updateData) {
            this.showUserUpdateDialog = true;
            this.userDialogForm.id = updateData.id;
            this.userDialogForm.email = updateData.email;
            this.userDialogForm.roll = updateData.roll;
        },
        openDeleteUserDialog(deleteData) {
            this.showUserDeleteDialog = true;
            this.deleteUserDialogForm.id = deleteData.id;
            this.deleteUserDialogForm.email = deleteData.email;
        },
        async getUser(userId) {
            try {
                const response = await this.apiGet('/user', { user_id: userId });
                const data = await response.json();
                this.showTabs = true;
                this.user_details = data;
                this.showSuccessNotification('Logged in.');
                await this.fetchDocs(userId);
                await this.fetchPolls('active');
                await this.fetchPolls('old');
                if (this.user_details.roll > 0) {
                    await this.fetchPolls('review');
                    this.getUsers();
                }
                this.getConditions();

                this.$nextTick(() => {
                    this.openTab(null, 'Active');
                    if (this.user_details.renew) {
                        this.showUserRenewDialog = true;
                    }
                });
            } catch (error) {
                this.showNotification('There was an error logging in, please try again with correct ID.');
                console.error('There has been a problem with your fetch operation:', error);
            }
        },
        async getUsers() {
            try {
                const response = await this.apiGet('/users', { user_id: this.user_details.id });
                const data = await response.json();
                this.users = data;
            } catch (error) {
                this.showNotification('There was an error fetching users, please try again.');
                console.error('There has been a problem with your fetch operation:', error);
            }
        },
        async getConditions() {
            try {
                const response = await this.apiGet('/conditions');
                const data = await response.json();
                this.conditionsData = data;
            } catch (error) {
                console.error('There has been a problem fetching conditions:', error);
            }
        },
        async conditionsUpdate() {
            try {
                this.conditionsData.user_id = this.user_details.id;
                const response = await this.apiRequest('/conditions', {
                    method: 'PUT',
                    body: JSON.stringify(this.conditionsData)
                });
                const data = await response.json();
                this.conditionsData = data;
                this.showSuccessNotification('Conditions updated.');
            } catch (error) {
                this.showNotification(error);
            }
        },
        convertLinks(text) {
            const urlPattern = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
            return text.replace(urlPattern, '<a href="$1" target="_blank">$1</a>');
        },
        parsePollChoices(poll) {
            const choices = poll.choices ? JSON.parse(poll.choices) : [];
            return {
                ...poll,
                choices
            };
        },
        formatOldPolls(polls) {
            return polls.map(poll => {
                const maxVotes = Math.max(...poll.choices.map(choice => choice[1]));
                const topChoices = poll.choices.filter(choice => choice[1] === maxVotes);

                const resultChoices = poll.choices.map(choice => {
                    return {
                        name: choice[0],
                        votes: choice[1],
                        isTopChoice: choice[1] === maxVotes
                    };
                });

                resultChoices.sort((a, b) => b.votes - a.votes);

                const result = {
                    ...poll,
                    choices: resultChoices
                };

                if (topChoices.length > 1) {
                    result.choice = "Draw: " + topChoices.map(choice => choice[0]).join(", ");
                } else if (topChoices.length === 1) {
                    result.choice = "Winner: " + topChoices[0][0];
                }

                return result;
            });
        },
        async fetchPolls(status) {
            if (!this.user_details.id) {
                return;
            }
            const pagination = this.pollPagination[status];
            if (!pagination) {
                return;
            }
            this.pollsLoading[status] = true;
            try {
                const response = await this.apiGet('/polls', {
                    user_id: this.user_details.id,
                    status,
                    page: pagination.page,
                    page_size: pagination.pageSize
                });
                const data = await response.json();
                const processedPolls = data.items.map(poll => this.parsePollChoices(poll));
                if (status === 'active') {
                    this.activePolls = processedPolls;
                }
                if (status === 'review') {
                    this.pollsInReview = processedPolls;
                }
                if (status === 'old') {
                    this.oldPolls = this.formatOldPolls(processedPolls);
                }
                pagination.page = data.page;
                pagination.pageSize = data.page_size;
                pagination.total = data.total;
            } catch (error) {
                this.showNotification('There was an error fetching polls, please try again.');
                console.error('There has been a problem with your fetch operation:', error);
            } finally {
                this.pollsLoading[status] = false;
            }
        },
        pollTotalPages(status) {
            const pagination = this.pollPagination[status];
            if (!pagination) {
                return 1;
            }
            const totalPages = Math.ceil(pagination.total / pagination.pageSize);
            return totalPages || 1;
        },
        changePollPage(status, page) {
            const pagination = this.pollPagination[status];
            if (!pagination) {
                return;
            }
            if (page < 1 || page > this.pollTotalPages(status)) {
                return;
            }
            pagination.page = page;
            this.fetchPolls(status);
        },
        async createUser() {
            try {
                await this.apiRequest('/user', {
                    method: 'POST',
                    body: JSON.stringify({
                        admin_id: this.user_details.id,
                        email: this.userDialogForm.email,
                        roll: this.userDialogForm.roll
                    })
                });

                this.showSuccessNotification('User created successfully.');
                this.showUserCreateDialog = false;
                this.getUsers();
            } catch (error) {
                this.showNotification('There was an error creating the user, please try again.');
                console.error('There has been a problem with your fetch operation:', error);
            }
        },
        validateForm() {
            this.errors = {};
            let isValid = true;

            if (!this.contactForm.name) {
                this.errors.name = "Name is required.";
                isValid = false;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!this.contactForm.email) {
                this.errors.email = "Email is required.";
                isValid = false;
            } else if (!emailRegex.test(this.contactForm.email)) {
                this.errors.email = "Please enter a valid email address.";
                isValid = false;
            }

            if (!this.contactForm.subject) {
                this.errors.subject = "Subject is required.";
                isValid = false;
            }

            if (!this.contactForm.message) {
                this.errors.message = "Message is required.";
                isValid = false;
            }

            const correctAnswer = this.captcha.number1 + this.captcha.number2;
            if (this.captcha.answer === null || this.captcha.answer !== correctAnswer) {
                this.errors.captcha = "Incorrect answer to the equation.";
                isValid = false;
            }

            return isValid;
        },
        async sendContactForm() {
            if (!this.validateForm()) {
                return;
            }
            try {
                await this.apiRequest('/contactform', {
                    method: 'POST',
                    body: JSON.stringify(this.contactForm)
                });
                this.contactForm = {
                    name: "",
                    email: "",
                    subject: "",
                    message: "",
                };
                this.captcha.answer = null;
                this.showSuccessNotification('Email sent. Thank you.');
            } catch (error) {
                this.showNotification('There was an error sending the message, please try again.');
                console.error('There has been a problem with your fetch operation:', error);
            }
        },
        async deleteUser(deleteData) {
            try {
                await this.apiRequest(`/user?user_id=${deleteData.id}`, {
                    method: 'DELETE'
                });
                this.showSuccessNotification('User deleted successfully.');
                this.getUsers();
                this.showUserDeleteDialog = false;
            } catch (error) {
                this.showNotification('There was an error deleting the user, please try again.');
                console.error('There has been a problem with your fetch operation:', error);
            }
        },
        async deletePoll(pollId) {
            try {
                await this.apiRequest(`/poll?poll_id=${pollId}&user_id=${this.user_details.id}`, {
                    method: 'DELETE'
                });
                this.showSuccessNotification('Poll deleted.');
                await this.fetchPolls('review');
                await this.fetchPolls('active');
                await this.fetchPolls('old');
            } catch (error) {
                this.showNotification('There was an error deleting the poll. Please try again.');
            }
        },
        showNotification(message) {
            this.notification.message = typeof message === 'string' ? message : (message?.message || String(message));
            this.notification.show = true;
            setTimeout(() => {
                this.notification.show = false;
            }, 5000);
        },
        showSuccessNotification(message) {
            this.success_notification.message = message;
            this.success_notification.show = true;
            setTimeout(() => {
                this.success_notification.show = false;
            }, 5000);
        },
        getVotePercentage(poll, choice) {
            const totalVotes = poll.choices.reduce((sum, choiceItem) => sum + choiceItem[1], 0);
            return totalVotes ? (choice[1] / totalVotes) * 100 : 0;
        },
        async submitPoll() {
            this.sanitizeChoices();
            const pollData = {
                user_id: this.user_details.id,
                title: this.newPoll.title,
                choices: this.newPoll.choices,
                duration: this.newPoll.duration
            };
            try {
                await this.apiRequest('/poll', {
                    method: 'POST',
                    body: JSON.stringify(pollData)
                });

                this.showSuccessNotification('Poll submitted successfully.');
                this.fetchPolls('review');
                this.newPoll.title = '';
                this.newPoll.choices = '';
                this.newPoll.duration = 1;
            } catch (error) {
                this.showNotification('There was an error submitting the poll. Please try again.');
            }
        },
        sanitizeChoices() {
            if (!this.newPoll.choices) {
                return;
            }
            this.newPoll.choices = this.newPoll.choices.replace(/,/g, ';');
        },
        async startFunct() {
            const urlParams = new URLSearchParams(window.location.search);
            let userId = urlParams.get('id');

            if (userId) {
                localStorage.setItem("userId", userId);
                await this.getUser(userId);
            } else {
                userId = localStorage.getItem("userId");
                if (userId) {
                    await this.getUser(userId);
                }
            }

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
        async fetchDocs(userId, page = this.docsPagination.page) {
            this.docsLoading = true;
            try {
                const response = await this.apiGet('/api/docs', {
                    user_id: userId,
                    page,
                    page_size: this.docsPagination.pageSize
                });
                const data = await response.json();

                this.docs = data.items.map(doc => {
                    const dateObj = doc.date ? new Date(doc.date) : null;
                    const year = dateObj ? dateObj.getFullYear() : 'Unknown';
                    return {
                        ...doc,
                        type: doc.name.endsWith('.pdf') ? 'pdf' : 'markdown',
                        date: dateObj,
                        year: year
                    };
                });

                this.docs.sort((a, b) => (b.date || 0) - (a.date || 0));
                this.docsPagination.page = data.page;
                this.docsPagination.pageSize = data.page_size;
                this.docsPagination.total = data.total;
            } catch (error) {
                console.error('Error fetching docs:', error);
            } finally {
                this.docsLoading = false;
            }
        },
        changeDocsPage(page) {
            if (page < 1 || page > this.docsTotalPages) {
                return;
            }
            this.docsPagination.page = page;
            this.fetchDocs(this.user_details.id, page);
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
            await this.startFunct();
        } catch (error) {
            console.error('Error fetching config:', error);
        }
    },
    mounted() {
        this.notification.message = '';
        this.notification.show = false;
    }
});
