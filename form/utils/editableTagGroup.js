import React, { Component } from "react";
import { Tag, Input, Tooltip, Icon } from 'antd';

export default class EditableTagGroup extends Component {
// component to create list of tags    

    constructor(props){
        super(props)
        this.state = {
            tags: [],
            inputVisible: false,
            inputValue: '',
        }; 
    }

    componentWillReceiveProps(props){
        this.setState({tags: props.value})
    }

    handleClose = (removedTag) => {
        const tags = this.props.value.filter(tag => tag !== removedTag);

        this.setState({ tags }, () => {
            this.props.onChange(tags)
        });
    }

    showInput = () => {
        this.setState({ inputVisible: true }, () => this.input.focus());
    }

    handleInputChange = (e) => {
        this.setState({ inputValue: e.target.value });
    }

    handleInputConfirm = () => {
        const state = this.state;
        const inputValue = state.inputValue;
        let tags = state.tags;

        if (inputValue && tags.indexOf(inputValue) === -1) {
            tags = [...tags, inputValue];
        }
        this.setState({
            tags,
            inputVisible: false,
            inputValue: '',
        }, () => {
            this.props.onChange(tags)
        });

    }

    saveInputRef = input => this.input = input

    render() {
        // console.log(this.props)
        const { inputVisible, inputValue } = this.state;
        let tags = this.state.tags        // tags = this.props.value || tags
        return (
            <div style={{ display: 'flex' }}>
                {tags.map(tag => {
                    const isLongTag = tag.length > 20;
                    const tagElem = (
                        <Tag key={tag} closable="true" size="large" afterClose={() => this.handleClose(tag)} style={{ height: '40px', lineHeight: '40px', fontSize: '12px' }}>
                            {isLongTag ? `${tag.slice(0, 20)}...` : tag}
                        </Tag>
                    );
                    return isLongTag ? <Tooltip title={tag} key={tag}>{tagElem}</Tooltip> : tagElem;
                })}
                {inputVisible && (
                    <Input
                        ref={this.saveInputRef}
                        type="text"
                        size="large"
                        style={{ width: 150, fontSize: 12 }}
                        value={inputValue}
                        onChange={this.handleInputChange}
                        onBlur={this.handleInputConfirm}
                        onPressEnter={this.handleInputConfirm}
                        placeholder={this.props.newLabel || ""}
                    />
                )}
                {!inputVisible && (
                    <div style={{ display: 'flex', width: 150 }}>
                        <Tag
                            onClick={this.showInput}
                            size="large"
                            style={{ background: '#fff', borderStyle: 'dashed', height: 40, fontSize: 12, display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: '0 0 auto' }}
                        >
                            <Icon type="plus" /> {this.props.newLabel || ""}
                        </Tag>
                    </div>
                )}
            </div>
        );
    }
}
