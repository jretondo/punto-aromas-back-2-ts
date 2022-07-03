import { IJoin, Iorder, Ipages, IWhere, IWhereParams } from "interfaces/Ifunctions";
import { EConcatWhere, EModeWhere } from "../../enums/EfunctMysql";
import { Tables, Columns } from "../../enums/EtablesDB";

export const multipleInsert = async (headers: Array<string>, rows: Array<any>): Promise<string> => {

    const headersQuery = new Promise((resolve, reject) => {
        let headersString: string = "";
        headers.map((header, key) => {
            if (headers.length === 1) {
                headersString = `(${headersString} ${header})`;
                resolve(headersString);
            } else {
                if (key === 0) {
                    headersString = `(${header},`;
                } else if (key === (headers.length - 1)) {
                    headersString = `${headersString} ${header})`;
                    resolve(headersString);
                } else {
                    headersString = `${headersString} ${header},`;
                }
            }
        })
    })

    const rowsQuery = new Promise((resolve, reject) => {
        let rowsString: string = "";
        rows.map((rowPure: Array<any>, key) => {
            let row: string = ""
            rowPure.map((item, key) => {
                if (rowPure.length === 1) {
                    row = `('${item}')`
                } else {
                    if (key === 0) {
                        row = `('${item}'`
                    } else if (rowPure.length - 1 === key) {
                        row = ` ${row}, '${item}')`
                    } else {
                        row = ` ${row}, '${item}'`
                    }
                }
            })
            if (rows.length === 1) {
                rowsString = `${row}`;
                resolve(rowsString);
            } else {
                if (key === 0) {
                    rowsString = `${row},`;
                } else if (key === (rows.length - 1)) {
                    rowsString = `${rowsString} ${row}`;
                    resolve(rowsString);
                } else {
                    rowsString = `${rowsString} ${row},`;
                }
            }
        })
    })
    return ` ${await headersQuery} VALUES ${await rowsQuery} `
}

export const selectContructor = (
    table: Tables,
    colSelect: Array<string>,
    whereParamsArray?: Array<IWhereParams>,
    groupBy?: Array<string>,
    pages?: Ipages,
    join?: Array<IJoin>,
    order?: Iorder
) => {
    let query = ` SELECT `;
    colSelect.map((item, key) => {
        if (colSelect.length === 1) {
            query = `${query} ${item} FROM ${table}`;
        } else {
            if (key === 0) {
                query = `${query} ${item}`;
            } else if (colSelect.length - 1 === key) {
                query = `${query}, ${item} FROM ${table}`
            } else {
                query = `${query}, ${item}`;
            }
        }
    })

    if (join) {
        join.map(item => {
            query = ` ${query} ${item.type} JOIN ${item.table} ON ${table}.${item.colOrigin} = ${item.table}.${item.colJoin} `
        })
    }

    if (whereParamsArray) {
        whereParamsArray.map((whereParams, key) => {
            let concat: string;
            let initWord = "WHERE";
            if (key > 0) {
                query = query + " AND ";
                initWord = "";
            }
            if (whereParams.concat === EConcatWhere.and) {
                concat = "AND";
            } else if (whereParams.concat === EConcatWhere.or) {
                concat = "OR";
            } else {
                concat = "";
            }

            if (whereParams.mode === EModeWhere.like) {
                whereParams.items.map((item, key) => {
                    if (whereParams.items.length === 1) {
                        query = query + ` ${initWord} (${item.column} LIKE '%${item.object}%') `;
                    } else {
                        if (key === 0) {
                            query = query + ` ${initWord} (${item.column} LIKE '%${item.object}%' `;
                        } else if (key === whereParams.items.length - 1) {
                            query = query + ` ${concat} ${item.column} LIKE '%${item.object}%') `;
                        } else {
                            query = query + ` ${concat} ${item.column} LIKE '%${item.object}%' `;
                        }
                    }
                });
            } else if (whereParams.mode === EModeWhere.strict) {
                whereParams.items.map((item, key) => {
                    if (whereParams.items.length === 1) {
                        query = query + ` ${initWord} (${item.column} = '${item.object}') `;
                    } else {
                        if (key === 0) {
                            query = query + ` ${initWord} (${item.column} = '${item.object}' `;
                        } else if (key === whereParams.items.length - 1) {
                            query = query + ` ${concat} ${item.column} = '${item.object}') `;
                        } else {
                            query = query + ` ${concat} ${item.column} = '${item.object}' `;
                        }
                    }
                });
            } else if (whereParams.mode === EModeWhere.dif) {
                whereParams.items.map((item, key) => {
                    if (whereParams.items.length === 1) {
                        query = query + ` ${initWord} (${item.column} != '${item.object}') `;
                    } else {
                        if (key === 0) {
                            query = query + ` ${initWord} (${item.column} != '${item.object}' `;
                        } else if (key === whereParams.items.length - 1) {
                            query = query + ` ${concat} ${item.column} != '${item.object}') `;
                        } else {
                            query = query + ` ${concat} ${item.column} != '${item.object}' `;
                        }
                    }
                });
            } else if (whereParams.mode === EModeWhere.higher) {
                whereParams.items.map((item, key) => {
                    if (whereParams.items.length === 1) {
                        query = query + ` ${initWord} (${item.column} > '${item.object}') `;
                    } else {
                        if (key === 0) {
                            query = query + ` ${initWord} (${item.column} > '${item.object}' `;
                        } else if (key === whereParams.items.length - 1) {
                            query = query + ` ${concat} ${item.column} > '${item.object}') `;
                        } else {
                            query = query + ` ${concat} ${item.column} > '${item.object}' `;
                        }
                    }
                });
            } else if (whereParams.mode === EModeWhere.higherEqual) {
                whereParams.items.map((item, key) => {
                    if (whereParams.items.length === 1) {
                        query = query + ` ${initWord} (${item.column} >= '${item.object}') `;
                    } else {
                        if (key === 0) {
                            query = query + ` ${initWord} (${item.column} >= '${item.object}' `;
                        } else if (key === whereParams.items.length - 1) {
                            query = query + ` ${concat} ${item.column} >= '${item.object}') `;
                        } else {
                            query = query + ` ${concat} ${item.column} >= '${item.object}' `;
                        }
                    }
                });
            } else if (whereParams.mode === EModeWhere.less) {
                whereParams.items.map((item, key) => {
                    if (whereParams.items.length === 1) {
                        query = query + ` ${initWord} (${item.column} < '${item.object}') `;
                    } else {
                        if (key === 0) {
                            query = query + ` ${initWord} (${item.column} < '${item.object}' `;
                        } else if (key === whereParams.items.length - 1) {
                            query = query + ` ${concat} ${item.column} < '${item.object}') `;
                        } else {
                            query = query + ` ${concat} ${item.column} < '${item.object}' `;
                        }
                    }
                });
            } else if (whereParams.mode === EModeWhere.lessEqual) {
                whereParams.items.map((item, key) => {
                    if (whereParams.items.length === 1) {
                        query = query + ` ${initWord} (${item.column} <= '${item.object}') `;
                    } else {
                        if (key === 0) {
                            query = query + ` ${initWord} (${item.column} <= '${item.object}' `;
                        } else if (key === whereParams.items.length - 1) {
                            query = query + ` ${concat} ${item.column} <= '${item.object}') `;
                        } else {
                            query = query + ` ${concat} ${item.column} <= '${item.object}' `;
                        }
                    }
                });
            }
        })
    }

    if (groupBy) {
        query = `${query} GROUP BY `;
        groupBy.map((item, key) => {
            if (key === groupBy.length - 1) {
                query = `${query} ${item}`;
            } else {
                if (groupBy.length - 1 === key) {
                    query = `${query} ${item} `;
                } else {
                    query = `${query} ${item}, `;
                }
            }
        })
    }
    let strOrder = ""
    if (order) {
        const desStr = order.asc ? "ASC" : "DESC"
        order.columns.map((item, key) => {
            if (key === order.columns.length - 1) {
                strOrder = strOrder + item + " " + desStr
            } else {
                strOrder = strOrder + item + " " + desStr + ", "
            }
        })
        strOrder = ` ORDER BY ${strOrder} `
    }

    if (pages) {
        let asc = "ASC";
        if (!pages.asc) {
            asc = "DESC"
        }
        const desdePag = (((pages.currentPage) - 1) * 10);

        if (order) {
            query = ` ${query} ${strOrder} LIMIT ${desdePag}, ${pages.cantPerPage} `;
        } else {
            query = ` ${query} ORDER BY ${pages.order} ${asc} LIMIT ${desdePag}, ${pages.cantPerPage} `;
        }
    }
    return query;
}

export const updateConstructor = (
    table: Tables,
    colUpdate: Array<IWhere>,
    whereParamsArray?: Array<IWhereParams>
) => {
    let query = ` UPDATE ${table} SET `;
    colUpdate.map((item, key) => {
        if (colUpdate.length === 1) {
            query = `${query} ${item.column} = ${item.object} `;
        } else {
            if (key === 0) {
                query = `${query} ${item.column} = ${item.object}`;
            } else {
                query = `${query}, ${item.column} = ${item.object}`;
            }
        }
    })

    if (whereParamsArray) {
        whereParamsArray.map((whereParams, key) => {
            let concat: string;
            let initWord = "WHERE";
            if (key > 0) {
                query = query + " AND ";
                initWord = "";
            }
            if (whereParams.concat === EConcatWhere.and) {
                concat = "AND";
            } else if (whereParams.concat === EConcatWhere.or) {
                concat = "OR";
            } else {
                concat = "";
            }

            if (whereParams.mode === EModeWhere.like) {
                whereParams.items.map((item, key) => {
                    if (whereParams.items.length === 1) {
                        query = query + ` ${initWord} (${item.column} LIKE '%${item.object}%') `;
                    } else {
                        if (key === 0) {
                            query = query + ` ${initWord} (${item.column} LIKE '%${item.object}%' `;
                        } else if (key === whereParams.items.length - 1) {
                            query = query + ` ${concat} ${item.column} LIKE '%${item.object}%') `;
                        } else {
                            query = query + ` ${concat} ${item.column} LIKE '%${item.object}%' `;
                        }
                    }
                });
            } else if (whereParams.mode === EModeWhere.strict) {
                whereParams.items.map((item, key) => {
                    if (whereParams.items.length === 1) {
                        query = query + ` ${initWord} (${item.column} = '${item.object}') `;
                    } else {
                        if (key === 0) {
                            query = query + ` ${initWord} (${item.column} = '${item.object}' `;
                        } else if (key === whereParams.items.length - 1) {
                            query = query + ` ${concat} ${item.column} = '${item.object}') `;
                        } else {
                            query = query + ` ${concat} ${item.column} = '${item.object}' `;
                        }
                    }
                });
            } else {
                whereParams.items.map((item, key) => {
                    if (whereParams.items.length === 1) {
                        query = query + ` ${initWord} (${item.column} != '${item.object}') `;
                    } else {
                        if (key === 0) {
                            query = query + ` ${initWord} (${item.column} != '${item.object}' `;
                        } else if (key === whereParams.items.length - 1) {
                            query = query + ` ${concat} ${item.column} != '${item.object}') `;
                        } else {
                            query = query + ` ${concat} ${item.column} != '${item.object}' `;
                        }
                    }
                });
            }
        })
    }

    return query;
}

export const updateConstructorJoin = (
    tableWhere: Tables,
    tableSet: Tables,
    colSet: string,
    colWhere: string,
    colUpdate: Array<IWhere>,
    whereParamsArray?: Array<IWhereParams>
) => {
    let query = ` UPDATE ${tableSet} SET `;
    colUpdate.map((item, key) => {
        if (colUpdate.length === 1) {
            query = `${query} ${tableSet}.${item.column} = ${item.object} `;
        } else {
            if (key === 0) {
                query = `${query} ${tableSet}.${item.column} = ${item.object}`;
            } else {
                query = `${query}, ${tableSet}.${item.column} = ${item.object}`;
            }
        }
    })

    query = ` ${query} FROM ${tableSet} s INNER JOIN ${tableWhere} w ON s.${colSet} = w.${colWhere} `

    if (whereParamsArray) {
        whereParamsArray.map((whereParams, key) => {
            let concat: string;
            let initWord = "WHERE";
            if (key > 0) {
                query = query + " AND ";
                initWord = "";
            }
            if (whereParams.concat === EConcatWhere.and) {
                concat = "AND";
            } else if (whereParams.concat === EConcatWhere.or) {
                concat = "OR";
            } else {
                concat = "";
            }

            if (whereParams.mode === EModeWhere.like) {
                whereParams.items.map((item, key) => {
                    if (whereParams.items.length === 1) {
                        query = query + ` ${initWord} (${tableWhere}.${item.column} LIKE '%${item.object}%') `;
                    } else {
                        if (key === 0) {
                            query = query + ` ${initWord} (${tableWhere}.${item.column} LIKE '%${item.object}%' `;
                        } else if (key === whereParams.items.length - 1) {
                            query = query + ` ${concat} ${tableWhere}.${item.column} LIKE '%${item.object}%') `;
                        } else {
                            query = query + ` ${concat} ${tableWhere}.${item.column} LIKE '%${item.object}%' `;
                        }
                    }
                });
            } else if (whereParams.mode === EModeWhere.strict) {
                whereParams.items.map((item, key) => {
                    if (whereParams.items.length === 1) {
                        query = query + ` ${initWord} (${tableWhere}.${item.column} = '${item.object}') `;
                    } else {
                        if (key === 0) {
                            query = query + ` ${initWord} (${tableWhere}.${item.column} = '${item.object}' `;
                        } else if (key === whereParams.items.length - 1) {
                            query = query + ` ${concat} ${tableWhere}.${item.column} = '${item.object}') `;
                        } else {
                            query = query + ` ${concat} ${tableWhere}.${item.column} = '${item.object}' `;
                        }
                    }
                });
            } else {
                whereParams.items.map((item, key) => {
                    if (whereParams.items.length === 1) {
                        query = query + ` ${initWord} (${tableWhere}.${item.column} != '${item.object}') `;
                    } else {
                        if (key === 0) {
                            query = query + ` ${initWord} (${tableWhere}.${item.column} != '${item.object}' `;
                        } else if (key === whereParams.items.length - 1) {
                            query = query + ` ${concat} ${tableWhere}.${item.column} != '${item.object}') `;
                        } else {
                            query = query + ` ${concat} ${tableWhere}.${item.column} != '${item.object}' `;
                        }
                    }
                });
            }
        })
    }
    return query;
}