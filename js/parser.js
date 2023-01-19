var parser = require('./grammar.js');
try {
    parser.parse(process.argv[2]);
} catch (e) {
    let response = [];
    let location = '';
    let expected = 'Expecting ';
    for (let i = 0; i <= e.hash.loc.last_column; i++) {
        if (i == e.hash.loc.last_column) {
            location += '^';
        } else {
            location += '-';
        }
    }
    e.hash.expected.forEach(exp => {
        expected += `${exp}, `;
    });
    expected += `got ${e.hash.token}`;
    response.push(`Parse error on line ${e.hash.loc.last_line}:`);
    response.push(`${process.argv[2]}`);
    response.push(location);
    response.push(expected);
    console.log(JSON.stringify(response));
}