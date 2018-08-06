import React, { Component } from "react";
import { Card, Table, Icon, Button, Modal, Spin, notification } from "antd";
import Exception from "ant-design-pro/lib/Exception";
import Parse from "parse";
import { Route } from "react-router-dom";
import Auth from "../../auth/Auth";
import env from "./../../env.json";
import moment from 'moment';

import PageHeader from "ant-design-pro/lib/PageHeader";
import "./Module.css";
import ListModule from "./list/List";
import FormModule from './form/Form';


// Module é um componente responsável por criar um CRUD
// Listagem, Cadastro e Edição.



export default class Module extends Component {
  state = {
    status: this.props.status || "loader", // "table", "create","error", "edit", "loader"
    dataTable: this.props.dataTable || [],
    permissions: this.props.permissions || [],
    actionsTable: this.props.actionsTable || [],
    schema: this.props.schema || [],
    loadingTable: false,
    loadingDataEdit: false,
    objectEdit: null,
    formRef: {},
    form: this.props.form,
    modal: {
      visible: false,
      content: null
    },
    invalidForm: false,
    AuthIsLoaded: false
  };

  tableContent = [];

  formRef = {};

  constructor(...args) {
    super(...args);
    Parse.initialize(env.application);
    Parse.serverURL = env.serverURL;
    this.searchRef = null;
    this.Auth = new Auth(Parse.User.current())
  }

  /* Muda a renderização padrão (default text) de uma coluna da tabela */
  checkRelationTableSchema() {
    let schema = this.state.schema.map(schema => {
      if (schema.type === "relation") {
        return Object.assign(
          {
            render: (valueKey, objectLine) => {
              return (
                <Button
                  icon="eye"
                  onClick={() => this.getTableRelation(valueKey, schema, objectLine)}>
                  Visualizar
                </Button>
              );
            },
            align: "center"
          },
          schema
        );
      } else if (schema.type == "switch") {
        return Object.assign(
          {
            render: (valueKey, objectLine) => {
              return (
                <Icon style={{ 'color': (valueKey) ? "green" : "red" }} type={(valueKey) ? "check" : "close"} />
              );
            },
            align: "center"
          },
          schema
        );
      } else {
        return schema;
      }
    });

    this.setState(state => {
      return {
        schema: schema
      };
    });
  }

  getTableRelation(row, schema, object) {
    let query = new Parse.Query(this.state.parse.collection);
    query.equalTo("objectId", object.objectId);
    query.first().then(ParseObjectSubClass => {
      let relation = new Parse.Relation(ParseObjectSubClass, schema.key);
      let query = relation.query();
      query.find().then(response => {
        let data = this.mapDataToTable(response);
        const ref = Modal.info({
          width: "70%",
          title: <h2>{schema.show.title}</h2>,
          content: <Table columns={schema.show.index} dataSource={data} />
        })
        this.setState(state => {
          return {
            modal: {
              visible: true
            }
          };
        });
      });
    });
  }

  mapDataToTable(array) {
    let format = function (json) {
      let type = data => {
        switch (typeof data) {
          case "number":
          case "boolean":
          case "string":
            return data.toString();
            break;
          default:
            return "";
            break;
        }
      };
      let j = {};
      for (let i in json) {
        j[i] = type(json[i]);
      }
      return j;
    };
    return array.map(json => {
      return format(json.toJSON());
    });
  }

  btnActionHeader() { // Função responsavel por criar os botões na barra superior da listagem.
    if (this.Auth.hasAction([`${this.state.form.module}Create`, "*"]))
      return (
        <Button
          style={{ float: "right" }}
          type="primary"
          color="green"
          onClick={() => this.toCreate()}>
          <Icon type="plus" /> Cadastrar
      </Button>
      );
  }

  render() {
    if (!this.state.AuthIsLoaded)
      return this.renderViewLoader()

    return (
      <div
        className={
          this.props.form.className
            ? "content-module " + this.props.form.className
            : "content-module"
        }>
        {/* <FormModule auth={this.Auth} module={this.props}/> */}
         <Route
          exact
          path={`${this.props.form['router-base']}`}
          render={() => {
            return this.renderViewHome()
          }}
        />
        <Route
          exact
          path={`${this.props.form['router-base']}/cadastrar`}
          render={() => {
            return <FormModule auth={this.Auth} module={this.props} />
          }}
        />
        <Route
          exact
          path={`${this.props.form['router-base']}/editar/:objectId`}
          render={(props) => {
            return <FormModule auth={this.Auth} module={this.props} objectEdit={props.match.params.objectId} />
          }}
        />
        <Route
          exact
          path={`${this.props.form['router-base']}/load`}
          render={() => this.renderViewLoader()}
        />
        <Route
          exact
          path={`${this.props.form['router-base']}/erro`}
          render={() => this.renderErrorForm()}
        />
        <Route
          exact
          path={`${this.props.form['router-base']}/block`}
          render={() => this.renderViewNoPermissison()}
        />
        {/* {_return} */}
      </div>
    );
  }

  renderViewHome() {
    if (this.Auth.hasAction([this.state.form.module, "*"])) {
      return (<div>
        <PageHeader
          className="table-header"
          title={this.props.title}
          action={this.btnActionHeader()} />

        {this.table(this.props.collection)}
      </div>
      );
    }
    return this.renderViewLoader()
  }

  navigateToRouterComponent(path, $module = this.props.form['router-base']) {
    this.props.url_props.history.push($module + path)
  }


  renderErrorForm() {
    return (
      <div>
        <Exception
          type="500"
          style={{
            minHeight: 500,
            height: "80%",
            marginTop: "100px"
          }}
          title="Erro"
          desc="Alguma coisa quebrou, entre em contato com o administrador do sistema."
          img="/images/500.svg"
          linkElement={() => (
            <Button
              type="primary"
              onClick={() => {
                this.props.url_props.history.goBack();
              }}>
              Voltar
            </Button>
          )}
        />
      </div>
    )
  }

  renderModal() {
    if (this.state.modal.visible) {
      return (
        <Modal
          title={this.state.modal.title}
          visible={this.state.modal.visible}>
          {this.state.modal.content}
        </Modal>
      );
    }
  }

  renderViewNoPermissison() {
    return (
      <div>
        <Exception
          type="403"
          style={{
            minHeight: 500,
            height: "80%",
            marginTop: "100px"
          }}
          title="Bloqueado"
          desc="Você não tem permissão pra acessar esse módulo."
          img="/images/block.svg"
          linkElement={() => (
            <Button
              type="primary"
              onClick={() => {
                this.navigateToRouterComponent('/', '/panel')
              }}>
              Voltar
            </Button>
          )}
        />
      </div>
    );
  }

  componentWillMount() {
    this.setState(state => {
      return {
        parse: {
          collection: Parse.Object.extend(this.props.collection)
        }
      };
    });
  }

  componentDidMount() {
    this.Auth.init(() => {
      if (this.Auth.hasAction([this.state.form.module])) {
        this.checkRelationTableSchema();
      } else {
        notification.error({
          message: "Erro de permissão.",
          description: 'Você não tem permissão pra acessar esse módulo.'
        })
        this.navigateToRouterComponent('/block')
      }
      this.setState(state => {
        return {
          AuthIsLoaded: true
        }
      })
    })
  }

  editRow(row) {
    this.navigateToRouterComponent(`/editar/${row.objectId}`)
  }

  removeItemTable(row) {
    let _Query = new Parse.Query(this.state.parse.collection);
    _Query.get(row.objectId, {
      success: object => {
        object.destroy({});
        // this.loadTableContent();
      }
    });
  }

  schemaIncludes() {
    return this.state.schema.filter(schema => {
        if (!!schema.relation || schema["relation-select"]) return schema;
      }).map(inc => inc.relation.name || inc.key);
  }

  table(collection) {
    if (this.Auth.hasAction([`${this.state.form.module}Read`, "*"]))
      return (
        <Card className="flex div-table">
          <ListModule module={this.props} auth={this.Auth} onRemoveRow={row => this.removeR} onEditRow={row => this.editRow(row)}/>
        </Card>
      );
  }

  toCreate() {
    this.navigateToRouterComponent(`/cadastrar`);
  }

  renderViewLoader() {
    return (
      <div className="center-div-loader">
        <Spin size="large" />
      </div>
    );
  }

}
