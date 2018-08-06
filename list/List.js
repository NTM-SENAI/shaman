import React, { Component } from "react";
import { Table, Input, Icon, Button, Modal } from "antd";
import Parse from "parse";

export default class ListModule extends Component {

    state = {
        dataTable: [],
        loadTableContent: true,
        loadingTable: this.props.module.loadingTable || false
    }

    constructor(props) {
        super(props);
        this.Auth = props.auth;
    }

    render() {
        return (
            <div>
                <Input.Search
                    onSearch={value => {
                        this.searchTable(value);
                    }}
                    onChange={event => {
                        if (!event.target.value) this.loadTableContent();
                    }}
                    placeholder="Pesquisar"
                    ref="inputSearch"
                    size="large"
                    className="search-input"
                    prefix={<Icon type="search" style={{ color: "rgba(0,0,0,.25)" }} />}
                />

                <Table
                    bordered
                    loading={this.state.loadingTable}
                    dataSource={this.state.dataTable || []}
                    columns={this.props.module.schema.concat(this.state.actionsTable || [])}
                    size="middle"
                    pagination={{ pageSize: 10 }}
                    locale={{ emptyText: "Nenhum resultado encontrado." }}
                />
            </div>
        );
    }

    componentWillMount() {
        this.setDefaultActionsTable()
    }

    componentDidMount() {
        this.loadTableContent()
    }

    setDefaultActionsTable() {
        if (this.props.module.actionsTable === true) {
            let cols = this.defaultActions();
            if (this.props.addCol) {
                cols = this.props.addCol.concat(cols);
            }
            this.setState(state => {
                return {
                    actionsTable: cols
                };
            });
        }
    }

    defaultActions() {
        if (this.Auth.hasAction([`${this.props.module.form.module}Delete`, `${this.props.module.form.module}Update`, '*'])) {
            return [{
                title: "Ações",
                key: "action",
                align: "center",
                className: "actions-col",
                render: (text, row, index) => {
                    let btnDel = this.Auth.hasAction([`${this.props.module.form.module}Delete`, "*"]) ? (
                        <Button
                            icon="delete"
                            onClick={() => this.showDeleteConfirm(row, index)}
                        />
                    ) : null;
                    let btnUpdate = this.Auth.hasAction([`${this.props.module.form.module}Update`, "*"]) ? (
                        <Button icon="edit" onClick={() => this.editRow(row)} />
                    ) : null;
                    return (
                        <div style={{ textAlign: "center" }}>
                            <Button.Group>
                                {btnDel}
                                {btnUpdate}
                            </Button.Group>
                        </div>
                    );
                }
            }
            ];
        }
        return [];
    }

    loadTableContent() {
        this.setState(
            state => {
                return {
                    loadingTable: true,
                    dataTable: []
                };
            },
            () => {
                let _Query = new Parse.Query(this.props.module.collection);
                _Query.include(this.schemaIncludes());
                if (!!this.props.whereTable) {
                    this.props.whereTable.forEach(_where => {
                        let value = null;
                        if (!_where.flags)
                            value = this.props.url_props.match.params[_where.paramUrl];
                        else if (_where.flags.type === "Pointer")
                            value = {
                                __type: "Pointer",
                                className: [_where.flags.class],
                                objectId: this.props.url_props.match.params[_where.paramUrl]
                            };

                        _Query.equalTo(_where.attr, value);
                    });
                }
                _Query.find(
                    {
                        success: response => {
                            response = response.map(item => {
                                return Object.assign({ key: item.id }, item.toJSON());
                            });
                            this.tableContent = response;
                            this.setState(state => {
                                return {
                                    loadingTable: false,
                                    dataTable: response,
                                    status: "table"
                                };
                            });
                        },
                        error: err => console.log(err)
                    }
                );
            }
        );
    }

    schemaIncludes() {
        return this.props.module.schema
            .filter(schema => {
                return (!!schema.relation || schema["relation-select"]) ? schema : false;
            })
            .map(inc => {
                return inc.relation.name || inc.key;
            });
    }

    searchTable(value) {
        this.setState(
            state => {
                return {
                    loadingTable: true
                };
            },
            () => {
                setTimeout(() => {
                    let $find = { $or: [] };
                    let _Query = new Parse.Query(this.props.module.collection);
                    this.props.module.schema.forEach(item => {
                        if (item.type === "text") {
                            $find.$or.push({
                                [item.key]: {
                                    $regex: value
                                }
                            });
                        } else if (item.type === "number" && !isNaN(value)) {
                            $find.$or.push({ [item.key]: parseInt(value) });
                        }
                    });
                    _Query._where = $find;
                    _Query.find({
                        success: response => {
                            this.normalizeTableRow(response);
                        },
                        error: err => console.log(err)
                    });
                })
            }
        );
    }

    normalizeTableRow(dataTable) {
        let headers = this.props.module.schema.map(schema => {
            return {
                key: schema.key,
                relation: schema.relation || null
            };
        });

        const loadData = (list, index, id, header) => {
            const _Extended = Parse.Object.extend(header.relation.className);
            const Query = new Parse.Query(_Extended);

            Query.get(id, {
                success: response => {
                    response = response.map(item => {
                        return Object.assign({ key: item.id }, item.toJSON());
                    });

                    this.tableContent = response;
                    this.setState(state => {
                        return {
                            loadingTable: false,
                            dataTable: response
                        };
                    });
                }
            });
        };

        dataTable = dataTable.map((row, index) => {
            row = row.toJSON();
            let object = {
                rowKey: row.objectId,
                key: row.objectId
            };
            headers.forEach(header => {
                if (!header.relation) {
                    object[header.key] = row[header.key];
                } else {
                    if (row[header.key]) {
                        object[header.key] = <Icon type="loading" />;
                        loadData(
                            dataTable,
                            index,
                            row[header.relation.name].objectId,
                            header
                        );
                    }
                }
            });
            return object;
        });

        this.setState(state => {
            return {
                loadingTable: false,
                dataTable: dataTable
            };
        });
    }

    editRow(row) {
        if (this.props.onEditRow) this.props.onEditRow(row)
    }

    showDeleteConfirm(row, index) {
        Modal.confirm({
            title: "Deseja realmente remover este item?",
            content: "Irá remover o item do banco de dados",
            okText: "Remover",
            cancelText: "Não, deixa pra lá",
            okType: "danger",
            onOk: () => {
                if (this.props.module.form.submit.collection === `User`)
                    return Parse.Cloud.run(`removeUser`, { objectId: row.objectId }).then(response => {
                        this.removeElementTableByIndex(index)
                    })
                this.removeItemTable(row, index);
            }
        });
    }

    removeItemTable(row, index) {
        let _Query = new Parse.Query(this.props.module.collection);
        _Query.get(row.objectId, {
            success: object => {
                object.destroy({});
                // this.loadTableContent();
                this.removeElementTableByIndex(index)
            }
        });
    }

    removeElementTableByIndex(index){
        let list = [...this.state.dataTable]
        list.splice(index, 1)
        this.setState(state => {
            return {
                dataTable: list
            }
        })
    }

}