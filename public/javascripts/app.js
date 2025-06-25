'use strict';

const BASE_URL = 'http://localhost:3000';
const API_PATH = 'api/contacts';
const API_URL = `${BASE_URL}/${API_PATH}`;

class Model {
  constructor() {
    this.contacts = [];
    /* Contacts processed to following format:
      {
        id: 1,
        fullName: "Chase Philpot",
        email: "philpotc@yahoo.com",
        phoneNumber: "1238675309",
        tags: ["LS", "Student", "Spot Lead"],
      }
    */
    this.tags = []; // ["LS", "Employee", "Student", "TA", "Spot Lead"]
  }

  /* API functions */
  async fetchAllContacts() {
    try {
      let response = await fetch(`${API_URL}`, { method: 'GET' });
      let data = await response.json();
      this.contacts = data.map(contact => {
        return this._processContact(contact);
      });

      if (!response.ok) throw new Error();
    } catch (error) {
      alert(`Failed to fetch contacts: ${error.message}`);
    }
  }

  async addContact(formData) {
    try {
      let response = await fetch(`${API_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(this._processContactForm(formData)),
      });

      let data = await response.json();
      this.contacts.push(this._processContact(data));

      if (!response.ok) throw new Error();
    } catch (error) {
      alert(`Failed to add contact: ${error.message}`);
    }
  }

  async editContact(contactId, formData) {
    try {
      let response = await fetch(`${API_URL}/${contactId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body:(() => {
          let obj = this._processContactForm(formData);
          obj.id = contactId;
          return JSON.stringify(obj);
        })(),
      });

      if (!response.ok) throw new Error('Bad request / Cannot find contact');

      let data = await response.json();

      this.contacts = this.contacts.map(contact => {
        return contact.id === data.id ? this._processContact(data) : contact;
      });
    } catch (error) {
      alert(`Failed to edit contact: ${error.message}`);
    }
  }

  async deleteContact (contactId) {
    try {
      let response = await fetch(`${API_URL}/${contactId}`, { method: 'DELETE', });
      if (!response.ok) throw new Error('Bad request / Cannot find contact');

      this.contacts = this.contacts.filter(contact => {
        return contact.id !== parseInt(contactId, 10);
      });

    } catch (error) {
      alert(`Failed to delete contact: ${error.message}`);
    }
  }

  /* Process data functions  */
  _processContact(contactData) {
    return {
      id: contactData.id,
      fullName: contactData.full_name,
      email: contactData.email,
      phoneNumber: contactData.phone_number,
      tags: contactData.tags ? contactData.tags.split(',') : [],
    };
  }

  _processContactForm(formData) {
    let obj = {
      full_name: formData.get('full_name'),
      email: formData.get('email'),
      phone_number: formData.get('phone_number'),
      tags: formData.getAll('tags').join(','),
    };

    if (formData.get('new_tag') && obj.tags.length > 0) {
      obj.tags += `,${formData.get('new_tag')}`;
    } else if (formData.get('new_tag')) {
      obj.tags += formData.get('new_tag');
    }

    return obj;
  }

  /* Tag functions */
  loadTags() {
    let tags = [];
    this.contacts.forEach(contact => {
      tags.push(contact.tags);
    });
    let flatTags = tags.flat();
    this.tags = Array.from(new Set(flatTags));
  }

  /* eslint-disable-next-line max-lines-per-function */
  getSearchMatches(query) {
    query = query.toLowerCase();

    return this.contacts.filter(contact => {
      let name = contact.fullName.toLowerCase();
      let [first, last] = name.split(' ');
      let email = contact.email.toLowerCase();
      let phoneNumber = String(contact.phoneNumber);
      let tags = contact.tags.map(tag => tag.toLowerCase());

      /* test number inputs */
      /* eslint-disable-next-line eqeqeq */
      if (Number(query) == query) return phoneNumber.startsWith(query);

       // validation pattern already requires space ' '
        return first.startsWith(query) ||
                last.startsWith(query) ||
                email.includes(query) ||
                tags.filter(tag =>
                  tag.startsWith(query)).length > 0;
    });
  }

  getTagMatches(query) {
    return this.contacts.filter(contact => {
      let lowerCasedTags = contact.tags.map(tag => tag.toLowerCase());
      return lowerCasedTags.includes(query.toLowerCase());
    });
  }
}

class View {
  constructor() {
    this.templates = {};
    this.compileTemplates();
    this.title = document.querySelector('#title');
    this.timeout = null;

    /* Static Elements */
    this.actionsContainer = document.querySelector('.actions-container');
    this.contactsContainer = document.querySelector('.contacts-container');
  }

  /* Template Names:
      - contactsTemplate
      - contactCardTemplate
      - contactFormTemplate
      - noContactsFoundTemplate
  */
  compileTemplates () {
    document.querySelectorAll('[type$=handlebars]').forEach(script => {
      this.templates[script.id] = Handlebars.compile(script.innerHTML);
      if (script.dataset.type === 'partial') {
        Handlebars.registerPartial(script.id, script.innerHTML);
      }
    });
  }

  drawContacts(contacts) {
    let noFilterIndicator = document.querySelector('.clear-filter');
    this.actionsContainer.style.display = 'flex';
    this.title.style.display = 'flex';

    if (noFilterIndicator) {
      noFilterIndicator.replaceWith(this.createSearchInput());
    }

    this.contactsContainer.innerHTML =
      this.templates.contactsTemplate({ contacts: contacts });
  }

  createSearchInput() {
    let searchDivContainer = document.createElement('div');
    searchDivContainer.className = 'actions-search';

    let magnifyingGlass = document.createElement('i');
    magnifyingGlass.className = "fa-solid fa-magnifying-glass";

    let searchInput = document.createElement('input');
    searchInput.id = 'searchBar';
    searchInput.placeholder = 'Search';

    searchDivContainer.append(magnifyingGlass, searchInput);

    return searchDivContainer;
  }

  drawTagFilteredContacts(contacts, query) {
    let searchInputIndicator = document.querySelector('.actions-search');

    if (searchInputIndicator) {
      searchInputIndicator.replaceWith(this.createClearFilterButton(query));
    } else {
      let currentFilter = document.querySelector('.clear-filter');
      currentFilter.innerHTML = `Clear Tag Filtering:${query}`;
    }

    this.contactsContainer.innerHTML =
      this.templates.contactsTemplate({ contacts: contacts });
  }

  createClearFilterButton(query) {
    let clearBtn = document.createElement('button');
    clearBtn.className = "btn actions-btn-lg clear-filter";
    clearBtn.textContent = `Clear Tag Filter: ${query}`;
    return clearBtn;
  }

  drawNoContactsFound(query) {
    this.contactsContainer.innerHTML =
      this.templates.noContactsFoundTemplate(query);
  }

  drawContactForm(context, preSelections) {
    this.actionsContainer.style.display = 'none';
    this.title.style.display = 'none';


    this.contactsContainer.innerHTML =
      this.templates.contactFormTemplate(context);

    if (preSelections) {
      preSelections.forEach(option => {
        [...document.querySelectorAll(`input[value="${option}"]`)].forEach(node => {
          node.checked = true;
        });
      });
    }
  }

  resetTitle () {
    let title = document.querySelector('#title');
    title.textContent = 'Contact List';
    title.style.color = 'black';
  }

  bindAddContactButtonClick(handler) {
    this.actionsContainer.addEventListener('click', event => {
      let target = event.target;

      if (target.classList.contains('add')) {
        handler();
      }
    });
  }

  bindFormRequest(handler) {
    let main = document.querySelector('main');

    main.addEventListener('click', event => {
      let target = event.target;

      if (target.tagName === 'BUTTON') {
        if (target.classList.contains('add')) {
          handler();
        } else if (target.classList.contains('edit')) {
          let contactId = target.closest('.contactCard').dataset.id;
          handler(contactId);
        }
      }
    });
  }

  bindFormCancel(handler) {
    this.contactsContainer.addEventListener('click', event => {
      let target = event.target;

      if (target.tagName === 'BUTTON' && target.classList.contains('cancel')) {
        event.preventDefault();
        handler();
      }
    });
  }

  bindAddEditContactFormSubmit(addHandler, editHandler) {
    this.contactsContainer.addEventListener('submit', event => {
      let target = event.target;

      if (target.tagName === 'FORM') {
        event.preventDefault();
        let form = document.querySelector('form');
        let formData = new FormData(form);

        if (form.classList.contains('add-form')) {
          addHandler(formData);
        } else if (form.classList.contains('edit-form')) {

          let contactId = form.dataset.id;
          editHandler(contactId, formData);
        }
      }
    });
  }

  bindDeleteContact(handler) {
    this.contactsContainer.addEventListener('click', event => {
      let target = event.target;

      if (target.tagName === 'BUTTON' && target.classList.contains('delete')) {
        event.preventDefault();
        if (confirm('Are you sure you want to delete this contact?')) {
          let contactId = target.closest('.contactCard').dataset.id;
          handler(contactId);
        }
      }
    });
  }

  bindSearchInputChange(handler) {
    let searchInputContainer = this.actionsContainer.querySelector('.actions-search');
    let searchInput = searchInputContainer.querySelector('input');

    searchInput.addEventListener('input', () => {
      let value = searchInput.value;
      handler(value);
    });
  }

  bindTagClick (handler) {
    this.contactsContainer.addEventListener('click', event => {
      let target = event.target;

      if (target.tagName === 'P' && target.classList.contains('contact-tag')) {
        if (this.timeout) clearTimeout(this.timeout);
        this.resetTitle();
        let tagQuery = target.textContent.trim();
        handler(tagQuery);
      }
    });
  }

  bindTagFilterReset (handler) {
    this.actionsContainer.addEventListener('click', event => {
      let target = event.target;

      if (target.tagName === 'BUTTON' && target.classList.contains('clear-filter')) {
        event.preventDefault();
        handler();
      }
    });
  }

  bindTagHover() {
    this.contactsContainer.addEventListener('mouseover', event => {
      let target = event.target;
      let title = document.querySelector('#title');

      if (target.classList.contains('contact-tag')) {
        this.timeout = setTimeout(() => {
          title.textContent = 'Click tag to filter';
          title.style.color = 'rebeccapurple';
        }, 1200);
      }
    });

    this.contactsContainer.addEventListener('mouseout', event => {
      let target = event.target;

      if (target.classList.contains('contact-tag')) {
        if (this.timeout) clearTimeout(this.timeout);
        this.resetTitle();
      }
    });
  }

  bindInputHover() {
    document.addEventListener('mouseover', event => {
      let target = event.target;

      if (target.tagName === 'INPUT' && target.id !== 'searchBar') {
        this.timeout = setTimeout(() => {
          target.nextElementSibling.style.display = 'flex';
        }, 3000);
      }
    });

    document.addEventListener('mouseout', event => {
      let target = event.target;

      if (target.tagName === 'INPUT' && target.id !== 'searchBar') {
        if (this.timeout) clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
          target.nextElementSibling.style.display = 'none';
        }, 3000);
      }
    });
  }
}

class Controller {
  constructor(model, view) {
    this.model = model;
    this.view = view;

    this.init();
  }

  bindEventHandlers() {
    /* main view add contact button*/
    this.view.bindAddContactButtonClick(this.handleFormRequest.bind(this));

    /* form-related */
    this.view.bindFormRequest(this.handleFormRequest.bind(this));
    this.view.bindFormCancel(this.handleFormCancel.bind(this));
    this.view.bindAddEditContactFormSubmit(
      this.handleAddContact.bind(this),
      this.handleEditContact.bind(this)
    );

    /* delete buttons */
    this.view.bindDeleteContact(this.handleDeleteContact.bind(this));
    /* input change */
    this.view.bindSearchInputChange(this.handleSearchInputChange.bind(this));

    /* tag-related */
    this.view.bindTagClick(this.handleTagClick.bind(this));
    this.view.bindTagFilterReset(this.handleTagFilterReset.bind(this));

    /* hover-related */
    this.view.bindTagHover();
    this.view.bindInputHover();
  }

  /* eslint-disable-next-line max-lines-per-function */
  handleFormRequest(id) {
    let contact, context, preSelections;

    if (id) {
      contact = this.model.contacts.filter(contact => {
        return contact.id === parseInt(id, 10);
      })[0];

      preSelections = this.model.tags.filter(tag => {
        return contact.tags.indexOf(tag) !== -1;
      });
    }

    context = {
      id: id ? id : '',
      formHeader: id ? 'Edit Contact' : 'Create Contact',
      formClass: id ? 'edit-form' : 'add-form',
      fullName: id ? contact.fullName : '',
      email: id ? contact.email : '',
      phoneNumber: id ? contact.phoneNumber : '',
      tags: this.model.tags,
    };

    this.view.drawContactForm(context, preSelections);
  }

  handleFormCancel() {
    this.view.drawContacts(this.model.contacts);
  }

  handleAddContact (formData) {
    this.model.addContact(formData).then(_ => {
      this.model.loadTags();
      this.view.drawContacts(this.model.contacts);
    });
  }

  handleEditContact (contactId, formData) {
    this.model.editContact(contactId, formData).then(_ => {
      this.model.loadTags();
      this.view.drawContacts(this.model.contacts);
    });
  }

  handleDeleteContact (contactId) {
    this.model.deleteContact(contactId).then(_ => {
      this.model.loadTags();
      this.view.drawContacts(this.model.contacts);
    });
  }

  handleSearchInputChange(query) {
    if (query.length > 0) {
      let matches = this.model.getSearchMatches(query);

      if (matches.length === 0) {
        this.view.drawNoContactsFound(query);
      } else {
        this.view.drawContacts(matches);
      }
    } else {
      this.view.drawContacts(this.model.contacts);
    }
  }

  handleTagClick(query) {
    let matches = this.model.getTagMatches(query);
    this.view.drawTagFilteredContacts(matches, query);
  }

  handleTagFilterReset() {
    this.view.drawContacts(this.model.contacts);
    this.view.bindSearchInputChange(this.handleSearchInputChange.bind(this));
  }

  init() {
    this.model.fetchAllContacts().then(_ => {
      this.model.loadTags();
      this.view.drawContacts(this.model.contacts);
    });

    this.bindEventHandlers();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  /* eslint-disable-next-line no-unused-vars */
  let app = new Controller(new Model(), new View());
});
