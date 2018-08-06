import React, { Component } from "react";
import { Form, Card, Breadcrumb, Tooltip, Button, Icon, Row, Col, Input, DatePicker, Switch, Select, Upload, notification, message, Slider } from 'antd';
import moment from 'moment';
import Parse from "parse";
import EditableTagGroup from './utils/editableTagGroup'
import './form.css';

export default class FormModule extends Component {
  //  todos os parans com o nome "node" se refere a um objeto que está no arquivo de configuração do módulo, em fields.

  state = {
    // formRef: { "code": "material_1015", "material_description": "Description of material", "measure": "m²", "provider": "101001", "package": "15365", "material": 20.76, "shipment_rate": 4.15, "ipi": 15, "pis_icms": 7,  "pis_c": 9.25 },
    formRef: {},
    invalidForm: true,
    loadingDataEdit: false
  }

  constructor(props) {
    super(props);
    this.Auth = props.auth;
    this.module = props.module;
    this.editParams = []
    if (this.props.objectEdit) this.editParams = [{}, this.props.objectEdit]
  }

  render() {
    return (
      <div>
        {this.renderViewForm(...this.editParams)}
      </div>
    )
  }

  renderViewForm(objectEdit = null, objectId = null) { // carrega os cados, caso seja um form de edição, e retorna o formulário preenchido com os dados ou não.

    if (!objectEdit && !this.Auth.hasAction([`${this.module.form.module}Create`, "*"])) {
      this.navigateToRouterComponent('/block') // redirect to create
      return false
    }
    if (objectEdit && !this.Auth.hasAction([`${this.module.form.module}Update`, "*"])) return false // redirect to create
    if (objectEdit && !this.state.loadingDataEdit) {
      if (Object.keys(objectEdit).length === 0) {
        let _Extended = Parse.Object.extend(this.module.form.submit.collection);
        let _Query = new Parse.Query(_Extended);

        _Query.get(objectId).then(response => {
          this.setState(state => {
            return {
              loadingDataEdit: true,
              formRef: this.normalizeToEdit(response.toJSON(), response)
            }
          })

        })
      }
    }

    if (this.module.formElement) return this.module.formElement;

    return (
      <div
        className={this.module.form.className || ""}
        style={{ minWidth: "60%" }}>
        <Form
          layout="vertical"
          onSubmit={event => {
            event.preventDefault();
            if (this.module.form['SubmitForm']) return this.module.form['SubmitForm'](this.state.formRef, objectEdit, objectId, this)
            this.saveFormItem({ edit: !!objectEdit })
          }}>
          <Card
            title={
              <div style={{ float: "left", width: "100%" }}>
                <Breadcrumb>
                  <Breadcrumb.Item onClick={() => this.navigateToRouterComponent(`/`)}>
                    {this.module.form[`title-module`]}
                  </Breadcrumb.Item>
                  <Breadcrumb.Item>{objectEdit ? `Editar` : `Cadastrar`}</Breadcrumb.Item>
                </Breadcrumb>
                <h2 className="no-mar-pad" style={{ float: "left" }}>
                  {this.module.title}
                </h2>
                <Tooltip visible={this.state.invalidForm} placement="topLeft" title="Preencha todos os campos.">
                  <Button
                    disabled={this.state.invalidForm}
                    type="primary"
                    id="btnSave"
                    className="btn-creator"
                    htmlType="submit">
                    Salvar<Icon type="save" />
                  </Button>
                </Tooltip>
              </div>
            }>
            {(this.module.form['FormComponent'])
              ? this.module.form['FormComponent'](this, this.module)
              : this.module.form.fields.map((fieldLine, rowKey) => {
                return (
                  <div key={rowKey}>
                    <Row key={rowKey} gutter={24} className="row-form-item">
                      {fieldLine.map((node, index) => {
                        let editable =
                          typeof node.edit === "undefined" ? true : node.edit;
                        let isCreate = !objectEdit;
                        let el = this.getElementByTypeSchema(
                          node,
                          24 / this.getSizeCol(fieldLine),
                          objectEdit,
                          index
                        );

                        return isCreate || editable ? el : false;
                      })}
                    </Row>
                  </div>
                );
              })}
          </Card>
        </Form>
      </div>
    );
  }

  getSizeCol(node) { // retorna o tamanho da coluna do formulário.
    return node.filter(item => {
      return item.type !== "header" || !!item.edit ? item : null;
    }).length;
  }

  loadContentFromConfigs(node) {
    if (node.loaded) return false;
    Parse.Cloud.run('getConfigByName', { name: node.optionConfig.name }).then(values => {
      node.options = values.toJSON().value.map(v => { return { label: v, value: v } });
      node.loaded = true;
      this.forceUpdate()
    })
  }

  getElementByTypeSchema(node, size, value = {}, index) { // retorna o elemento com base no tipo do nó de configuração do formulário.
    let title = node.title ? `${node.title}` : <div>&nbsp;</div>;

    if (node.relation) {
      this.state.formRef[node.key] = value['__value']
    }

    if (node.optionConfig)
      this.loadContentFromConfigs(node)


    switch (node.type) {
      case "header":
        return (
          <div key={node.key}>
            <h2>{node.title}</h2>
          </div>
        );
        break;
      case "text":
      case "password":
      case "email":
        return (
          <Col span={size} key={node.key} className={node.className || ""}>
            <Form.Item ref={`${node.key}_form_item`} label={title} validateStatus={this.validateNodeValue(node)} help={(this.validateNodeValue(node) === "error") ? node.errorMessage || "" : ""}>
              <Input
                onChange={event =>
                  this.updateRefValue(node, event.target.value)
                }
                ref={node.key}
                placeholder={node.title}
                type={node.type}
                value={this.state.formRef[node.key] || ""}
                size="large"
                node={node}
                {...node["element-attr"]}
              />
            </Form.Item>
          </Col>
        );
        break;
      case "number":
        return (
          <Col span={size} key={node.key} className={node.className || ""}>
            <Form.Item ref={`${node.key}_form_item`} label={title} >
              <Input
                type="number"
                ref={node.key}
                onChange={event => this.updateRefValue(node, event.target.value)}
                size="large"
                placeholder={node.title}
                step="0.1"
                node={node}
                value={parseFloat(this.state.formRef[node.key]) || null}
                {...node["element-attr"]}
              />
            </Form.Item>
          </Col>
        );
        break;
      case "select":
        return (
          <Col span={size} key={node.key} className={node.className || ""}>
            <Form.Item ref={`${node.key}_form_item`} label={title} >
              <Select
                ref={node.key}
                onChange={event => this.updateRefValue(node, event)}
                showSearch
                notFoundContent="Não encontrado"
                size="large"
                node={node}
                placeholder={node.title}
                value={this.state.formRef[node.key]}
                filterOption={(input, option) =>
                  option.props.children
                    .toLowerCase()
                    .indexOf(input.toLowerCase()) >= 0
                }
                {...node["element-attr"]}>
                {node.options.map((opt, key) => {
                  return (
                    <Select.Option key={key} value={opt.value}>
                      {opt.label}
                    </Select.Option>
                  );
                })}
              </Select>
            </Form.Item>
          </Col>
        );
        break;
      case "date-picker":
        return (
          <Col span={size} key={node.key} className={node.className || ""}>
            <Form.Item ref={`${node.key}_form_item`} label={title} >
              <DatePicker
                ref={node.key}
                node={node}
                onChange={event => this.updateRefValue(node, event)}
                size="large"
                placeholder={node.title}
                format="DD/MM/YYYY"
                value={this.state.formRef[node.key]}
                {...node["element-attr"]}
              />
            </Form.Item>
          </Col>
        );
        break;
      case "switch":
        return (
          <Col span={size} key={node.key} className={node.className || ""}>
            <Form.Item ref={`${node.key}_form_item`} label={title} >
              <Switch
                ref={node.key}
                node={node}
                onChange={event => this.updateRefValue(node, event)}
                size="large"
                checkedChildren="S"
                unCheckedChildren="N"
                checked={this.state.formRef[node.key]}
                {...node["element-attr"]}
              />
            </Form.Item>
          </Col>
        );
        break;
      case "multi-select":
        return (
          <Col span={size} key={node.key} className={node.className || ""}>
            <Form.Item ref={`${node.key}_form_item`} label={title} >
              <Select
                ref={node.key}
                node={node}
                onChange={event => this.updateRefValue(node, event)}
                showSearch
                notFoundContent="Não encontrado"
                size="large"
                mode="multiple"
                placeholder={node.title}
                value={this.state.formRef[node.key]}
                filterOption={(input, option) =>
                  option.props.children
                    .toLowerCase()
                    .indexOf(input.toLowerCase()) >= 0
                }
                {...node["element-attr"]}>
                {node.options.map((opt, key) => {
                  return (
                    <Select.Option key={key} value={opt.value}>
                      {opt.label}
                    </Select.Option>
                  );
                })}
              </Select>
            </Form.Item>
          </Col>
        );
        break;
      case "relation":
        this.loadContentRelation(node);
        return (
          <Col span={size} key={node.key} className={node.className || ""}>
            <Form.Item ref={`${node.key}_form_item`} label={title} >
              <Select
                ref={node.key}
                node={node}
                mode="multiple"
                style={{ width: "100%" }}
                placeholder="Selecione..."
                size="large"
                onChange={event => this.updateRefValue(node, event)}
                value={this.state.formRef[node.key] || []}
                {...node["element-attr"]}>
                {node.options.map((opt, key) => {
                  {
                    /* console.log(opt, "option"); */
                  }
                  return (
                    <Select.Option key={key} value={opt.value}>
                      {opt.label}
                    </Select.Option>
                  );
                })}
              </Select>
            </Form.Item>
          </Col>
        );
        break;
      case "profile-image":
        let previewUrl = ""
        if (this.state.formRef[node.key])
          previewUrl = this.state.formRef[node.key].previewUrl

        return (
          <Col span={size} key={node.key} className={node.className || ""}>
            <Form.Item ref={`${node.key}_form_item`} label={title} >
              <Upload
                ref={node.key}
                node={node}
                beforeUpload={(file, fileList) => this.beforeUploadImage(node, file, fileList)}
                className="upload-list-inline"
                {...node["element-attr"]}>
                <div className="image-perfil-file" style={{ 'backgroundImage': `url(${previewUrl})` }}>
                  {(!previewUrl) ?
                    <Icon type="picture" /> :
                    <div className="background-image-file">
                      <Icon className="icon-remove-element-image" type="delete" onClick={(event) => this.removeImageElementTypeImage(node, event)} />
                    </div>}
                </div>
                <Button className="btn-image-perfil">
                  <Icon type="upload" /> Selecionar imagem
                  </Button>
              </Upload>
            </Form.Item>
          </Col>
        )
        break;
      case "white-space":
        return (
          <Col span={size} key={"white-" + index} className={node.className || ""}>
          </Col>
        )
        break;
      case "confirm-password":
        return (
          <Col span={size} key={node.key} className={node.className || ""}>
            <Form.Item ref={`${node.key}_form_item`} label={title} validateStatus={this.validateNodeValue(node)}  help={(this.validateNodeValue(node) === "error") ? node.errorMessage || "" : ""}>
              <Input
                ref={node.key}
                node={node}
                onChange={event =>
                  this.updateRefValue(node, event.target.value)
                }
                placeholder={node.title}
                type="password"
                value={this.state.formRef[node.key]}
                size="large"
                {...node["element-attr"]}
              />
            </Form.Item>
          </Col>
        )
        break;
      case "input-option":
        return (
          <Col span={size} key={node.key.input} className={node.className || ""}>
            <Form.Item ref={`${node.key}_form_item`} label={title} >
              <div style={{ marginBottom: 16 }}>
                <Input node={node} size="large" ref={node.key.input} onChange={(event) => this.updateRefValue(node, event.target.value, node.key.input)} addonAfter={
                  <Select
                    ref={node.key.select}
                    node={node}
                    placeholder='Selecione..'
                    onChange={(event) => {
                      this.updateRefValue(node, event, node.key.option)
                    }}
                    value={this.state.formRef[node.key.option]}
                    style={node["style-select"] || { width: 80 }}>
                    {node.option.map((item, index) => <Select.Option key={item} value={item}>{item}</Select.Option>)}
                  </Select>
                }
                  value={this.state.formRef[node.key.input]}
                  {...node["element-attr"]} />
              </div>
            </Form.Item>
          </Col>
        )
        break;
      case "input-slide":
        if (!node.config) node.config = {}
        return (
          <Col span={size} key={node.key} className={(node.className || "") + " input-slide-col"}>
            <Form.Item ref={`${node.key}_form_item`} label={title} >
              <Slider ref={node.key + "_slider"} node={node} size="large" {...node.config.slider || {}} required={node.required ? node.required : false} onChange={value => this.updateRefValue(node, value)} value={(parseFloat(this.state.formRef[node.key]) || null)} />
              <Input ref={node.key + "_input"} node={node} size="large" {...node.config.input || {}} required={node.required ? node.required : false} type="number" onChange={event => this.updateRefValue(node, event.target.value)} value={(parseFloat(this.state.formRef[node.key]) || null)} />
              <Input node={node} size="large" {...node.config.show || {}} disabled={true} value={node.arrange(this.state.formRef[node.key], this.state, this) || 0} />
            </Form.Item>
          </Col>
        )
        break;
      case "render":
        return (
          <Col span={size} key={node.key} className={(node.className || "") + " render-col"}>
            <Form.Item ref={`${node.key}_form_item`} label={title} >
              {node.render(this.state, this, node)}
            </Form.Item>
          </Col>
        )
        break;
      case "tag-list":
        return (
          <Col span={size} key={node.key} className={(node.className || "") + " tag-list"}>
            <Form.Item ref={`${node.key}_form_item`} label={title} >
              <EditableTagGroup
                {...node["element-attr"]}
                onChange={values => this.updateRefValue(node, values)}
                value={this.state.formRef[node.key] || []} node={node} />
            </Form.Item>
          </Col>
        )
        break;
      default:
        return <div />;
        break;
    }
  }

  validateNodeValue(node, value) { // função para validar deternminado nó
    
    if (node.type === "password" || node.type === "confirm-password") {
      if (this.state.formRef[node.key] === this.state.formRef[node.confirmValue]) {
        return 'success'
      }
      return "error"
    }

    // if(node.type != 'render' && this.nodeIsRequired(node) && (!this.refs[node.key] || !this.refs[node.key].props.value)){
    //   return 'error';
    // }
      if (!this.state.formRef[node.key]) return "success"

    if (node.regex) {
      return (new RegExp(node.regex).test(this.state.formRef[node.key]) ? "success" : "error")
    }
    
    // node.reg
    return "success"
  }

  loadContentRelation(node) { // carrega os dados relacionados. Parse Relation...
    if (node.loaded) return false;
    let ParseQuery = new Parse.Query(
      new Parse.Object.extend(node["relation-select"].class)
    );
    ParseQuery.find({
      success: response => {
        node.options = response.map((item, key) => {
          let data = item.toJSON();
          return {
            key: data[node["relation-select"].key],
            label: data[node["relation-select"].label],
            value: data[node["relation-select"].value]
          };
        });

        node["_parseObjectOptionsList"] = response;
        node.loaded = true;
        this.forceUpdate()
      },
      error: err => {
        notification.error({
          title: "Erro, ao carregar dados do select.",
          message: err
        });
      }
    });
  }

  updateRefValue(node, value, key = null) { // Faz a atualização do state, função é chamada pelos elementos do formulário.
    if (node['element-attr'] && node['element-attr']['onChangeOverride'] && typeof node['element-attr']['onChangeOverride'] === 'function')
      return node['element-attr']['onChangeOverride'](this, node, value)

    let attrFormRef = key ? key : node.key;

    let validForm = false
    this.formSchemaValids().forEach(node => {
      if (Array.isArray(this.state.formRef[node.key]) && this.state.formRef[node.key].length === 0 || !this.state.formRef[node.key]) {
        validForm = false
      }
    })

    if (node.type === "number" || node.type === 'input-slide') {
      if (!isNaN(value) && value !== "") value = parseFloat(value);
    }

    let _form = Object.assign({}, this.state.formRef);
    _form[attrFormRef] = value;

    if (!!node.relation) {
      _form["__value"] = value;
    }

    this.setState(state => { return { formRef: _form, invalidForm: validForm } }, () => setTimeout(() => this.forceUpdate()));
  }

  formSchemaValids() { // retorna os elementos que serão inseridos no banco
    return this.module.form.fields
      .reduce((acc, value) => {
        return acc.concat(value);
      }, [])
      .filter(item => {
        let _return = true;
        if (['header', 'white-space', 'confirm-password', 'profile-image'].indexOf(item.type) >= 0) {
          _return = false;
        } else if (this.state.objectEdit && item.edit === false) {
          _return = false
        } else {
          _return = true;
        }
        return _return
      });
  }

  normalizeToEdit(object, realResponseObject) {
    // retorna um json com os dados tratados para edição. 
    // Por exemplo, o componente de data-picker precisa receber um object da lib moment, essa função converte a data do banco para a lib moment
    let newStateObject = {
      objectId: object.objectId
    };

    this.formSchemaValids().forEach(node => {
      if (!!node.relation && !node["relation-select"]) {
        newStateObject[node.key] = object[node.key][node.relation.value];
      } else if (node["relation-select"]) {
        newStateObject[node.key] = [];
        let ItemKeyObject = realResponseObject.get(node.key)

        if (!ItemKeyObject) {
          return this.navigateToRouterComponent('/erro')
        }

        ItemKeyObject
          .query()
          .find()
          .then(response => {
            newStateObject[node.key] = response.map(object => {
              return object.id;
            });
            this.forceUpdate()
          }).catch(err => {
            console.log(err)
          })
        // this.forceUpdate()
      } else if (node.type === 'input-option') {
        newStateObject[node.key.input] = object[node.key.input]
        newStateObject[node.key.option] = object[node.key.option]
      } else if (node.type === "date-picker") {
        if (object[node.key])
          newStateObject[node.key] = moment(object[node.key].iso)
      } else {
        if (node.edit !== false) newStateObject[node.key] = object[node.key];
      }
    });

    let profileNodes = this.getNodesByType('profile-image');
    if (profileNodes.length >= 1) {
      profileNodes = profileNodes.map(node => {
        if (realResponseObject.get(node.key))
          return {
            [node.key]: {
              url: realResponseObject.get(node.key),
              previewUrl: `${Parse.serverURL}/files/${Parse.applicationId}/${realResponseObject.get(node.key)}`,
              new: false,
              __type: 'Photo'
            }
          }
      })
      if (profileNodes[0])
        newStateObject = Object.assign(newStateObject, profileNodes[0])
    }

    return newStateObject;
  }

  getNodesByType(type) { // retorna o nó de configuração do modulo com base no tipo.
    return this.props.module.form.fields
      .reduce((acc, value) => {
        return acc.concat(value);
      }, []).filter(node => node.type === type)
  }

  getNodesByKey(key) { // retorna o nó de configuração do modulo com base no tipo.
    return this.props.module.form.fields
      .reduce((acc, value) => {
        return acc.concat(value);
      }, []).filter(node => node.key === key)[0] || null
  }

  saveFormItem(condForm) { // essa function é responsável por salvar ou editar os dados de fato. 
    // create -> cria uma nova row no banco
    // edit -> edita uma row no banco

    let classRef = this;

    let create = () => {
      let _Extended = Parse.Object.extend(this.props.module.form.submit.collection);

      let $ParseObject = new _Extended();
      this.formSchemaValids().forEach(node => {
        if (node.type === "date-picker") {
          $ParseObject.set(node.key, this.state.formRef[node.key].toDate())
        } else if (node.type === "input-option") {
          $ParseObject.set(node.key.input, this.state.formRef[node.key.input])
          $ParseObject.set(node.key.option, this.state.formRef[node.key.option])
        } else if (!node.relation && !node["relation-select"]) {
          $ParseObject.set(node.key, this.state.formRef[node.key]);
        } else if (node["relation-select"]) {
          let $RelationObject = new Parse.Relation($ParseObject, node.key);
          let $objectList = this.state.formRef[node.key].map(id => {
            let $obj = node["_parseObjectOptionsList"].filter(ObjectOption => {
              return ObjectOption.id === id;
            })[0];
            return $obj;
          });
          $RelationObject.add($objectList);
        } else {
          if (node.relation.__type === "Pointer") {
            let PointerObject = new Parse.Object(node.relation.from);
            PointerObject.id = this.state.formRef[node.key];
            $ParseObject.set(node.key, PointerObject);
          }
        }
      });

      let afterSave = () => {
        notification.success({
          message: "Sucesso!",
          description: "Cadastro realizado com succeso!"
        });
        this.navigateToRouterComponent('/')
      };

      $ParseObject.save(null, {
        success: parseObject => {
          let profileImage = this.getNodesByType('profile-image');
          if (profileImage.length > 0) {
            let formRef = this.state.formRef[profileImage[0].key];
            if (!formRef) return false;
            let ParseFile = new Parse.File(formRef.file.uid, formRef.file)
            ParseFile.save(null).then(fileSaved => {
              Parse.Cloud.run('saveProfileImage', {
                objectId: parseObject.id,
                name: fileSaved.name()
              }).then(response => {
                afterSave();
              })
            })
            return false;
          }
          return afterSave();
        },
        error: err => {
          console.log(err)
          notification.error({
            message: "Erro de cadastro.",
            description: "Erro, tente novamente"
          });
        }
      });
    };

    let edit = () => {
      let _Extended = Parse.Object.extend(this.props.module.form.submit.collection);
      let _Query = new Parse.Query(_Extended);
      let relationNodeList = [];
      let _State = this.state; // react state

      let finishEdit = objectEdited => {
        message.success("Edição realizada com sucesso!");
        // this.loadTableContent();
        classRef.setState(state => {
          return {
            formRef: {},
            loadingDataEdit: false
          }
        })
        this.navigateToRouterComponent('/');
      };

      _Query.get(this.state.formRef.objectId, {
        success: $ParseObject => {
          console.log($ParseObject)
          this.formSchemaValids().forEach(node => {
            if (node.type === "date-picker") {
              $ParseObject.set(node.key, this.state.formRef[node.key].toDate())
            } else if (node.type === "input-option") {
              $ParseObject.set(node.key.input, this.state.formRef[node.key.input])
              $ParseObject.set(node.key.option, this.state.formRef[node.key.option])
            } else if (!node.relation && !node["relation-select"]) {
              $ParseObject.set(node.key, this.state.formRef[node.key]);
            } else if (node["relation-select"]) {
              relationNodeList.push(node);
            } else {
              if (node.relation.__type === "Pointer") {
                let PointerObject = new Parse.Object(node.relation.from);
                PointerObject.id = this.state.formRef[node.key];
                $ParseObject.set(node.key, PointerObject);
              }
            }
          });


          // faz o update de todos os fields do form que são do tipo relation de forma recursiva
          let removeAllRelationsAndSave = ($parseObjectToEdit, relationNodeObjectList, indexOfNodeList, Callback) => {
            if (relationNodeObjectList.length === indexOfNodeList) {
              Callback()
              return false
            }

            let node = relationNodeObjectList[indexOfNodeList] // node sempre faz referencia a um objeto do .json de configuração do módulo.
            let $parseObjectRelation = $parseObjectToEdit.relation(node.key)
            $parseObjectRelation.query().find().then($ParseResponse => {

              if ($ParseResponse.length > 0) {
                $parseObjectRelation.remove($ParseResponse) // deleta todos os dados da table relation.
              }

              let $parseObjectRelationToSave = _State.formRef[node.key].map(id => {
                let $obj = node["_parseObjectOptionsList"].filter(ObjectOption => {
                  return ObjectOption.id === id;
                })[0];
                return $obj;
              })

              if ($parseObjectRelationToSave.length > 0)
                $parseObjectRelation.add($parseObjectRelationToSave)

              $parseObjectToEdit.save(null).then($parseSavedResponse => {
                removeAllRelationsAndSave($parseObjectToEdit, relationNodeObjectList, ++indexOfNodeList, Callback)
              })
            })
          }

          if (this.props.module.form.module !== 'User') {
            $ParseObject.save(null, {
              success: objectEdited => {
                let profileImageNodes = this.getNodesByType('profile-image')
                if (profileImageNodes.length) {
                  let profileNode = this.state.formRef[profileImageNodes[0].key]
                  if (profileNode.new) {
                    let file = new Parse.File(profileNode.file.uid, profileNode.file)
                    file.save().then(saved => {
                      objectEdited.set(profileImageNodes[0].key, saved.name())
                      objectEdited.save(null).then()
                    })
                  }
                }

                if (relationNodeList.length) {
                  removeAllRelationsAndSave(objectEdited, relationNodeList, 0, () => {
                    // if(this.getSchemaNodeByKey())
                    finishEdit(objectEdited)
                  });
                } else {
                  finishEdit(objectEdited);
                }
              },
              error: err => {
                message.error("Erro ao tentar editar.")
              }
            });
          } else {
            let hasFile = this.getNodesByType('profile-image')
            // console.log(hasFile);
            if (hasFile.length > 0) {
              hasFile = hasFile[0];
              console.log(this.state.formRef[hasFile.key] && this.state.formRef[hasFile.key].new)
              if (this.state.formRef[hasFile.key] && this.state.formRef[hasFile.key].new) {
                let file = new Parse.File(this.state.formRef[hasFile.key].file.uid, this.state.formRef[hasFile.key].file)
                file.save().then(savedFile => {
                  let newFormRef = Object.assign(this.state.formRef, {
                    photo: savedFile.name()
                  })
                  Parse.Cloud.run('updateUser', {
                    formRef: JSON.stringify(newFormRef),
                    module: this.props.module.form.module
                  }).then(response => {
                    finishEdit(response.ParseObjectSaved);
                  })
                })
                return false;
              }
            }
            Parse.Cloud.run('updateUser', {
              formRef: JSON.stringify(this.state.formRef),
              module: this.props.module.form.module
            }).then(response => {
              finishEdit(response.ParseObjectSaved);
            })


          }
        },
        error: err => {
          notification.error({
            message: "Erro de edição",
            notification: "Erro ao tentar editar"
          });
        }
      });
    };

    if (condForm.edit) return edit();

    create();
  }

  beforeUploadImage(node, file, fileList) { // essa função exibe a imagem faz o preview no componente de imagem.
    let formRef = Object.assign({}, this.state.formRef)
    formRef[node.key] = {
      file: file,
      fileList: fileList,
      previewUrl: URL.createObjectURL(file),
      new: true,
      __type: 'Photo'
    }
    this.setState(state => {
      return {
        formRef
      }
    })

    return false
  }


  navigateToRouterComponent(path, $module = this.props.module.form['router-base']) {
    // navigate to path
    this.props.module.url_props.history.push($module + path)
  }

  removeImageElementTypeImage(node, event) {
    // set value of formRef image with value null
    let formRef = Object.assign({}, this.state.formRef)
    formRef[node.key] = null
    this.setState(state => {
      return {
        formRef
      }
    })
    event.preventDefault();
    event.stopPropagation()
    return false
  }

  getNumberValue(attr) {
    // retorna o valor de um componente number
    // sempre use pra pegar valores do formRef, se for um number.
    // caso tente pegar direto, o valor pode vim undefined.
    return parseFloat(this.state.formRef[attr]) || 0
  }

  getRefElement(obj, attr) {
    // retorna a referencia com as informações do elemento
    // Nunca pegar valores dos elementos, sempre pegue do state.
    return (this.refs[obj]) ? this.refs[obj][attr] : {}
  }

  validateFormRef(FormRef, ObjectToSave) {
    // check refs values to validate all inputs on form.
    // before save formValue, return true or false to call default save function.
    // check the props value of ref and check if ref has required attr.
    // the default of required is true.
    let refKeys = this.getRefWithFormItem(false);
    for(let key in refKeys){
      // console.log(this.refs[key])
      if(!this.refs[key].props.value && this.nodeIsRequired(this.refs[key].props.node)){
        // this.refs[key + '_form_item'].props['invalid'] = true;
      }
    }
    return true;
  }

  getRefWithFormItem(formItem = false, object = {}) {
    // false return input values
    Object.keys(this.refs).filter(v => v.includes("_form_item") === formItem).forEach(v => object[v] = this.refs[v])
    return object;
  }

  nodeIsRequired(node){
    if(node.required) return node.required

    if(node['element-attr'] && node['element-attr'].required) return node['element-attr'].required

    return true;
  }

  nodeHasEmptyValue(value){
    return (!value || value.length == 0) ? false : true
  }

}
