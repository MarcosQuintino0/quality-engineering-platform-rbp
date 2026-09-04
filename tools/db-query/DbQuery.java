import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

/**
 * Consulta somente leitura aos bancos H2 do Restful Booker Platform.
 *
 * Existe porque o SUT usa H2 embarcado e expoe acesso externo pelo servidor
 * TCP proprio do H2, cujo protocolo e especifico da JVM e nao tem driver
 * maduro em Node. A ferramenta e deliberadamente minima: recebe uma URL JDBC
 * e uma consulta, devolve JSON no stdout e nao altera nada na aplicacao.
 *
 * Uso: java DbQuery.java &lt;jdbcUrl&gt; &lt;usuario&gt; &lt;senha&gt; &lt;sql&gt;
 */
public final class DbQuery {

    public static void main(String[] args) throws Exception {
        if (args.length != 4) {
            System.err.println("Uso: DbQuery <jdbcUrl> <usuario> <senha> <sql>");
            System.exit(2);
        }

        String jdbcUrl = args[0];
        String user = args[1];
        String password = args[2];
        String sql = args[3];

        // Guarda de somente leitura: qualquer comando que nao seja consulta e
        // recusado antes de tocar no banco. A suite observa o estado do SUT
        // pelo banco, nunca o modifica por esse caminho.
        String normalised = sql.trim().toLowerCase();
        boolean isRead = normalised.startsWith("select")
                || normalised.startsWith("show")
                || normalised.startsWith("with");

        if (!isRead) {
            System.err.println("Apenas consultas de leitura sao permitidas. Recebido: " + sql);
            System.exit(3);
        }

        try (Connection connection = DriverManager.getConnection(jdbcUrl, user, password)) {
            connection.setReadOnly(true);

            try (Statement statement = connection.createStatement();
                 ResultSet resultSet = statement.executeQuery(sql)) {
                System.out.println(toJson(resultSet));
            }
        }
    }

    private static String toJson(ResultSet resultSet) throws Exception {
        ResultSetMetaData metaData = resultSet.getMetaData();
        int columnCount = metaData.getColumnCount();

        List<String> rows = new ArrayList<>();
        while (resultSet.next()) {
            List<String> fields = new ArrayList<>();
            for (int column = 1; column <= columnCount; column++) {
                String label = quote(metaData.getColumnLabel(column));
                fields.add(label + ":" + renderValue(resultSet, column));
            }
            rows.add("{" + String.join(",", fields) + "}");
        }

        return "[" + String.join(",", rows) + "]";
    }

    private static String renderValue(ResultSet resultSet, int column) throws Exception {
        Object value = resultSet.getObject(column);

        if (value == null) {
            return "null";
        }
        if (value instanceof Number || value instanceof Boolean) {
            return value.toString();
        }
        if (value instanceof java.sql.Array) {
            Object[] elements = (Object[]) ((java.sql.Array) value).getArray();
            List<String> rendered = new ArrayList<>();
            for (Object element : elements) {
                rendered.add(element == null ? "null" : quote(element.toString()));
            }
            return "[" + String.join(",", rendered) + "]";
        }
        return quote(resultSet.getString(column));
    }

    /** Serializa uma string como literal JSON, escapando o que a norma exige. */
    private static String quote(String value) {
        StringBuilder out = new StringBuilder();
        out.append('"');

        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);

            if (c == '"') {
                out.append('\\').append('"');
            } else if (c == '\\') {
                out.append('\\').append('\\');
            } else if (c == '\n') {
                out.append('\\').append('n');
            } else if (c == '\r') {
                out.append('\\').append('r');
            } else if (c == '\t') {
                out.append('\\').append('t');
            } else if (c < 0x20) {
                out.append(String.format("\\u%04x", (int) c));
            } else {
                out.append(c);
            }
        }

        out.append('"');
        return out.toString();
    }
}
